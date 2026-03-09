import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Step 1: Fetch the watch page to get caption tracks
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const watchResp = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await watchResp.text();

  // Extract captions data from the page
  const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s);
  if (!captionMatch) {
    // Try InnerTube API as fallback
    return await fetchViaInnerTube(videoId);
  }

  let captionsData;
  try {
    captionsData = JSON.parse(captionMatch[1]);
  } catch {
    return await fetchViaInnerTube(videoId);
  }

  const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    throw new Error("No captions available for this video. The video must have subtitles/captions enabled.");
  }

  // Prefer English, fall back to first available
  const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
  const captionUrl = enTrack.baseUrl;

  // Step 2: Fetch the actual caption XML
  const captionResp = await fetch(captionUrl);
  const captionXml = await captionResp.text();

  // Step 3: Parse XML to text with timestamps
  const segments: string[] = [];
  const regex = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(captionXml)) !== null) {
    const startSec = parseFloat(match[1]);
    const minutes = Math.floor(startSec / 60);
    const seconds = Math.floor(startSec % 60);
    const timestamp = `[${minutes}:${seconds.toString().padStart(2, "0")}]`;
    const text = match[2]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .replace(/\n/g, " ")
      .trim();
    if (text) segments.push(`${timestamp} ${text}`);
  }

  if (segments.length === 0) {
    throw new Error("Failed to parse captions from YouTube.");
  }

  return segments.join("\n");
}

async function fetchViaInnerTube(videoId: string): Promise<string> {
  const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "17.31.35",
          androidSdkVersion: 30,
          hl: "en",
        },
      },
    }),
  });

  const data = await resp.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    throw new Error("No captions available for this video. The video must have subtitles/captions enabled.");
  }

  const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
  const captionResp = await fetch(enTrack.baseUrl);
  const captionXml = await captionResp.text();

  const segments: string[] = [];
  const regex = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(captionXml)) !== null) {
    const startSec = parseFloat(match[1]);
    const minutes = Math.floor(startSec / 60);
    const seconds = Math.floor(startSec % 60);
    const timestamp = `[${minutes}:${seconds.toString().padStart(2, "0")}]`;
    const text = match[2]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .replace(/\n/g, " ")
      .trim();
    if (text) segments.push(`${timestamp} ${text}`);
  }

  if (segments.length === 0) {
    throw new Error("Failed to parse captions from YouTube.");
  }

  return segments.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { videoId, videoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch real transcript from YouTube
    console.log("Fetching transcript for video:", videoId);
    const transcript = await fetchYouTubeTranscript(videoId);
    console.log("Transcript fetched, length:", transcript.length);

    const systemPrompt = `You are an AI educational content analyzer. You are given a real transcript from a YouTube video. Analyze it and generate comprehensive learning materials. You must respond using the provided tool/function.

Based on the transcript below, generate:
1. A concise summary (2-3 paragraphs)
2. 4-6 key concepts
3. 3-5 important highlights (direct quotes or key points from the transcript)
4. 4-6 structured notes with titles and content
5. Difficulty level classification (Beginner/Intermediate/Advanced)
6. 5-8 multiple choice questions with 4 options each based on the actual content
7. 3-5 detected topics with explanations

Make everything accurate to the actual transcript content.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the transcript:\n\n${transcript}\n\nAnalyze this transcript and generate learning materials.` },
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned from AI");

    const result = JSON.parse(toolCall.function.arguments);
    // Include the real transcript in the result
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
