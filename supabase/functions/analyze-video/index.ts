import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Fetch the YouTube video page to get caption tracks
  const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(videoPageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube page: ${response.status}`);
  }

  const html = await response.text();

  // Extract captions URL from the page source
  const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (!captionMatch) {
    // Try alternative: check if captions exist in playerCaptionsTracklistRenderer
    const altMatch = html.match(/playerCaptionsTracklistRenderer.*?"captionTracks":\s*(\[.*?\])/);
    if (!altMatch) {
      throw new Error("No captions/transcript available for this video. The video may not have subtitles enabled.");
    }
    const tracks = JSON.parse(altMatch[1]);
    if (!tracks.length) throw new Error("No caption tracks found.");
    
    const captionUrl = tracks[0].baseUrl;
    return await fetchAndParseCaption(captionUrl);
  }

  const tracks = JSON.parse(captionMatch[1]);
  if (!tracks.length) throw new Error("No caption tracks found.");

  // Prefer English, fallback to first available
  const englishTrack = tracks.find((t: any) => t.languageCode === "en" || t.vssId?.includes(".en"));
  const selectedTrack = englishTrack || tracks[0];
  const captionUrl = selectedTrack.baseUrl;

  return await fetchAndParseCaption(captionUrl);
}

async function fetchAndParseCaption(captionUrl: string): Promise<string> {
  const captionResponse = await fetch(captionUrl);
  if (!captionResponse.ok) {
    throw new Error("Failed to fetch caption data");
  }

  const captionXml = await captionResponse.text();

  // Parse XML transcript - extract text and timestamps
  const segments: { start: number; text: string }[] = [];
  const regex = /<text start="([\d.]+)"[^>]*>(.*?)<\/text>/gs;
  let match;

  while ((match = regex.exec(captionXml)) !== null) {
    const startSeconds = parseFloat(match[1]);
    let text = match[2]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, "")
      .trim();

    if (text) {
      segments.push({ start: startSeconds, text });
    }
  }

  if (segments.length === 0) {
    throw new Error("Could not parse any transcript segments.");
  }

  // Format with timestamps
  const formatted = segments.map((seg) => {
    const mins = Math.floor(seg.start / 60);
    const secs = Math.floor(seg.start % 60);
    const timestamp = `[${mins}:${secs.toString().padStart(2, "0")}]`;
    return `${timestamp} ${seg.text}`;
  });

  return formatted.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { videoId, videoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Step 1: Fetch real transcript from YouTube
    let transcript: string;
    try {
      transcript = await fetchYouTubeTranscript(videoId);
    } catch (transcriptError) {
      console.error("Transcript fetch error:", transcriptError);
      throw new Error(
        `Could not retrieve transcript: ${transcriptError instanceof Error ? transcriptError.message : "Unknown error"}. Please make sure the video has captions/subtitles enabled.`
      );
    }

    // Step 2: Send the REAL transcript to AI for analysis
    const systemPrompt = `You are an AI educational content analyzer. You have been given the ACTUAL transcript of a YouTube video. Analyze this real transcript and generate comprehensive learning materials based ONLY on the actual content of the video.

Do NOT make up or hallucinate any content. All your analysis must be directly based on the transcript provided.

Generate:
1. A concise summary (2-3 paragraphs) of what the video actually covers
2. 4-6 key concepts actually discussed in the video
3. 3-5 important highlights from the actual content
4. 4-6 structured notes with titles and content based on real topics covered
5. Difficulty level classification (Beginner/Intermediate/Advanced) based on the actual complexity
6. 5-8 multiple choice questions based on actual content discussed
7. 3-5 detected topics with explanations based on the real content`;

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
          { role: "user", content: `Here is the actual transcript of the YouTube video (${videoUrl}):\n\n${transcript}\n\nPlease analyze this transcript and generate learning materials based on it.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the complete video analysis based on the real transcript",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Concise summary of the actual video content" },
                  keyConcepts: { type: "array", items: { type: "string" }, description: "Key concepts from the video" },
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
                required: ["summary", "keyConcepts", "highlights", "notes", "difficulty", "mcqs", "topics"],
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
    // Attach the real transcript to the result
    result.transcript = transcript;

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
