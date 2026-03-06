import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { videoId, videoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI educational content analyzer. Given a YouTube video ID and URL, generate comprehensive learning materials. You must respond using the provided tool/function.

The video URL is: ${videoUrl}
The video ID is: ${videoId}

Based on your knowledge of this video (or if you don't know it, create plausible educational content about common topics), generate:
1. A realistic transcript (~500 words) with timestamp markers like [0:00], [1:30], etc.
2. A concise summary (2-3 paragraphs)
3. 4-6 key concepts
4. 3-5 important highlights
5. 4-6 structured notes with titles and content
6. Difficulty level classification (Beginner/Intermediate/Advanced)
7. 5-8 multiple choice questions with 4 options each
8. 3-5 detected topics with explanations

Make everything educational, accurate, and useful for students.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this YouTube video: ${videoUrl}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the complete video analysis",
              parameters: {
                type: "object",
                properties: {
                  transcript: { type: "string", description: "Full transcript with timestamps" },
                  summary: { type: "string", description: "Concise summary" },
                  keyConcepts: { type: "array", items: { type: "string" }, description: "Key concepts" },
                  highlights: { type: "array", items: { type: "string" }, description: "Important highlights" },
                  notes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["title", "content"],
                    },
                  },
                  difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
                  mcqs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correctIndex: { type: "integer" },
                      },
                      required: ["question", "options", "correctIndex"],
                    },
                  },
                  topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["title", "content"],
                    },
                  },
                },
                required: ["transcript", "summary", "keyConcepts", "highlights", "notes", "difficulty", "mcqs", "topics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned from AI");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
