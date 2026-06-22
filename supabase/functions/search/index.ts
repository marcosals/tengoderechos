import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

// CORS Headers to allow React Native mobile clients to call this directly
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is missing on backend." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { query, jurisdiction } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required and must be a string." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Resolve search jurisdictions. Federal laws apply everywhere, so we always include 'Federal'.
    const searchJurisdictions = ["Federal"];
    if (jurisdiction && jurisdiction.toLowerCase() !== "federal") {
      searchJurisdictions.push(jurisdiction);
    } else if (!jurisdiction) {
      // Default to CDMX if none is provided
      searchJurisdictions.push("CDMX");
    }

    // 2. Generate vector embedding for the search query using Gemini gemini-embedding-2
    const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: {
          parts: [{ text: query.trim() }]
        },
        outputDimensionality: 768
      }),
    });

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      throw new Error(`Gemini Embedding API failed: ${errText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding.values;

    // 3. Query Supabase database for vector matching using the match_legal_documents RPC
    // Use the client's request headers or fallback to anon key
    const clientAuthHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: clientAuthHeader ? { Authorization: clientAuthHeader } : {},
      },
    });

    const { data: matchedDocuments, error: dbError } = await supabaseClient.rpc(
      "match_legal_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.35, // Minimum similarity score (cosine distance > 0.35)
        match_count: 5,         // Retrieve top 5 relevant articles
        filter_jurisdictions: searchJurisdictions,
      }
    );

    if (dbError) {
      throw new Error(`Database vector search failed: ${dbError.message}`);
    }

    // 4. Construct prompts for LLM
    const contextText = matchedDocuments && matchedDocuments.length > 0
      ? matchedDocuments.map((doc: any) => `[${doc.code_name} - ${doc.article_number} (${doc.jurisdiction})]\n${doc.content}`).join("\n\n")
      : "No se encontraron artículos de ley relevantes en la base de datos para esta jurisdicción.";

    const systemPrompt = `Eres "Tengo Derechos", un asistente legal de IA experto en derecho mexicano (civil, penal, laboral, familiar y de tránsito).
Tu objetivo es explicar al usuario sus derechos y obligaciones civiles en lenguaje sencillo, directo y comprensible, evitando tecnicismos innecesarios.

Instrucciones Críticas:
1. Responde a la pregunta del usuario basándote en los artículos de ley que se te proporcionan en el "Contexto legal".
2. Es OBLIGATORIO citar explícitamente el nombre de la ley y el número del artículo en el que te apoyas (ej. "Artículo 34 del Reglamento de Tránsito de la CDMX").
3. Si los artículos proporcionados en el contexto no contienen la respuesta a la pregunta del usuario, explícalo de manera amable y menciónalo.
4. Siempre termina tu respuesta con un descargo de responsabilidad claro: "Esta respuesta es puramente informativa y no constituye asesoramiento legal formal. Te recomendamos consultar con un abogado."
`;

    const userPrompt = `Jurisdicción de búsqueda: ${searchJurisdictions.join(", ")}
Pregunta del usuario: ${query}

Contexto legal (Artículos oficiales de la base de datos):
${contextText}
`;

    // 5. Generate plain language explanation using Gemini 2.5 Flash and log/increment query count in parallel
    const chatPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      }),
    });

    const dbLogPromise = supabaseClient.rpc("increment_popular_query", {
      p_query_text: query.trim()
    });

    // Resolve both operations in parallel to guarantee logging while maintaining speed
    const [chatResponse, dbLogResult] = await Promise.all([chatPromise, dbLogPromise]);

    if (dbLogResult.error) {
      console.error("❌ Failed to log/increment query count:", dbLogResult.error.message);
    }

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      throw new Error(`Gemini Chat API failed: ${errText}`);
    }

    const chatData = await chatResponse.json();
    const answer = chatData.candidates[0].content.parts[0].text;

    // 6. Return response to mobile client
    const output = {
      answer: answer,
      citations: (matchedDocuments || []).map((doc: any) => ({
        id: doc.id,
        jurisdiction: doc.jurisdiction,
        code_name: doc.code_name,
        article_number: doc.article_number,
        content: doc.content,
        similarity: doc.similarity,
      })),
    };

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
