import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is missing on backend." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate Request
    const clientAuthHeader = req.headers.get("Authorization");
    if (!clientAuthHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: clientAuthHeader },
      },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Authorize Admin role
    const { data: isAdmin, error: adminError } = await supabaseClient.rpc("is_admin");
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Access Denied: Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize service client to insert bypassed RLS records
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Parse inputs
    const { text, jurisdiction, codeName } = await req.json();
    if (!text || !jurisdiction || !codeName) {
      return new Response(
        JSON.stringify({ error: "Missing text, jurisdiction, or codeName in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Split text by "Artículo" keyword using lookahead
    const articleRegex = /(?=Artículo\s+\d+)/gi;
    const chunks = text.split(articleRegex);
    const articleChunks = chunks.slice(1).map((c: string) => c.trim()).filter(Boolean);

    console.log(`🚀 Found ${articleChunks.length} articles to parse.`);

    let successCount = 0;
    const errors = [];

    // 4. Ingest and embed each article chunk sequentially
    for (let i = 0; i < articleChunks.length; i++) {
      const chunk = articleChunks[i];
      const match = chunk.match(/^Artículo\s+(\d+(?:\s+Bis|Secundus|Ter)?[.-]*)/i);
      const rawArticleNum = match ? match[0] : `Artículo ${i + 1}`;
      const cleanArticleNum = rawArticleNum.replace(/[.-]/g, '').trim();

      const textToEmbed = `Jurisdicción: ${jurisdiction} | Ordenamiento: ${codeName} | Artículo: ${cleanArticleNum} | Contenido: ${chunk}`;

      try {
        // Generate Gemini Embedding
        const embedResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-2",
            content: { parts: [{ text: textToEmbed }] },
            outputDimensionality: 768
          })
        });

        if (!embedResponse.ok) {
          throw new Error(`Gemini Embedding API failed: ${await embedResponse.text()}`);
        }

        const embedData = await embedResponse.json();
        const embedding = embedData.embedding.values;

        // Insert into staging master table
        const { error: insertError } = await supabaseService
          .from("master_legal_documents")
          .insert({
            jurisdiction,
            code_name: codeName,
            article_number: cleanArticleNum,
            content: chunk,
            embedding
          });

        if (insertError) {
          throw new Error(`Master DB Insert failed: ${insertError.message}`);
        }

        successCount++;
      } catch (err: any) {
        console.error(`❌ Failed to process ${cleanArticleNum}:`, err.message);
        errors.push({ article: cleanArticleNum, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Ingestion process finished.",
        totalProcessed: articleChunks.length,
        successCount,
        failureCount: errors.length,
        errors
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
