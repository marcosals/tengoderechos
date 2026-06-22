import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { encodeBase64 } from "https://deno.land/std@0.203.0/encoding/base64.ts";

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
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is missing on backend." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get auth headers from client request
    const clientAuthHeader = req.headers.get("Authorization");
    if (!clientAuthHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create supabase client under the user's auth context
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: clientAuthHeader },
      },
    });

    // Verify session and get user profile info
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request payload
    const { storagePath, contextText } = await req.json();
    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: "Missing storagePath in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Download the raw file from private Storage bucket
    const { data: fileBlob, error: downloadError } = await supabaseClient.storage
      .from("media-uploads")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download uploaded media: ${downloadError?.message || "File not found"}`);
    }

    // 4. Convert Blob/File binary data to Base64
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64Data = encodeBase64(arrayBuffer);

    // Resolve mime type
    const fileExt = storagePath.split(".").pop()?.toLowerCase() || "jpeg";
    const mimeType = fileExt === "png" ? "image/png" : fileExt === "webp" ? "image/webp" : "image/jpeg";

    // 5. Query Google Gemini 2.5 Flash Vision API
    const systemPrompt = `Eres "Tengo Derechos", un asistente legal de IA experto en derecho mexicano (civil, penal, laboral, familiar y de tránsito).
Analiza la imagen provista (y el contexto textual del usuario) para determinar si existe alguna infracción, abuso de autoridad o hecho relevante regulado por la ley en México.

Instrucciones Críticas:
1. Identifica el suceso (ej. choque, grúa remolcando auto, retén policial, invasión de espacios).
2. Estipula la severidad del riesgo para el ciudadano (Riesgo: "Bajo", "Moderado" o "Alto").
3. Cita leyes mexicanas explícitas vinculadas al hecho (ej. "Artículo 50 del Reglamento de Tránsito de la CDMX" o "Artículo 16 de la Constitución Federal").
4. Formula recomendaciones prácticas sobre qué hacer en ese momento (ej. no dar dinero, tomar fotos de placas, esperar al ajustador).
5. Debes responder estrictamente en formato JSON utilizando esta estructura:
{
  "title": "Título corto y descriptivo del caso",
  "risk": "Bajo" | "Moderado" | "Alto",
  "description": "Explicación clara y comprensible del análisis legal de la imagen.",
  "laws": ["Ley/Código y Artículo citado 1", "Ley/Código y Artículo citado 2"],
  "recommendation": "Acciones concretas sugeridas para el ciudadano."
}
`;

    const userPrompt = contextText 
      ? `Contexto provisto por el ciudadano: "${contextText}"`
      : "Analiza esta imagen y describe los derechos y obligaciones aplicables en México.";

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Vision API call failed: ${errText}`);
    }

    const resData = await response.json();
    const rawTextResponse = resData.candidates[0].content.parts[0].text;
    const parsedReport = JSON.parse(rawTextResponse.trim());

    // 6. Write final report into the public.media_analyses database table
    const { data: analysisRecord, error: insertError } = await supabaseClient
      .from("media_analyses")
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        context_text: contextText || null,
        analysis_report: parsedReport,
        status: "completed"
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError.message);
      // Fallback: Return generated report even if DB save fails
    }

    return new Response(JSON.stringify(parsedReport), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred during analysis." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
