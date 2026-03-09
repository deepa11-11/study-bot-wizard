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

  const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s);
  if (!captionMatch) {
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
    throw new Error("NO_CAPTIONS");
  }

  const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
  return await fetchCaptionXml(enTrack.baseUrl);
}

async function fetchViaInnerTube(videoId: string): Promise<string> {
  const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: "ANDROID", clientVersion: "17.31.35", androidSdkVersion: 30, hl: "en" },
      },
    }),
  });

  const data = await resp.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    throw new Error("NO_CAPTIONS");
  }

  const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
  return await fetchCaptionXml(enTrack.baseUrl);
}

async function fetchCaptionXml(url: string): Promise<string> {
  const captionResp = await fetch(url);
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
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "").replace(/\n/g, " ").trim();
    if (text) segments.push(`${timestamp} ${text}`);
  }

  if (segments.length === 0) throw new Error("NO_CAPTIONS");
  return segments.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { videoId, videoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Try fetching real transcript
    let transcript: string | null = null;
    let hasRealTranscript = false;
    try {
      transcript = await fetchYouTubeTranscript(videoId);
      hasRealTranscript = true;
      console.log("Real transcript fetched, length:", transcript.length);
    } catch (e) {
      console.log("No captions available, falling back to AI generation");
    }

    const commonInstructions = `
1. A concise summary (2-3 paragraphs)
2. 4-6 key concepts
3. 3-5 important highlights
4. 4-6 structured notes with titles and content
5. Difficulty level classification (Beginner/Intermediate/Advanced)
6. 5-8 multiple choice questions with 4 options each
7. 3-5 detected topics with explanations

Make everything educational, accurate, and useful for students.`;

    let systemPrompt: string;
    let userMessage: string;

    if (hasRealTranscript) {
      systemPrompt = `You are an AI educational content analyzer. You are given a real transcript from a YouTube video. Analyze it and generate comprehensive learning materials using the provided tool/function. Generate:${commonInstructions}`;
      userMessage = `Here is the real transcript:\n\n${transcript}\n\nAnalyze this transcript and generate learning materials.`;
    } else {
      systemPrompt = `You are an AI educational content analyzer. Given a YouTube video URL, generate comprehensive learning materials using the provided tool/function.

The video URL is: ${videoUrl}
The video ID is: ${videoId}

Generate:
1. A realistic transcript (~500 words) with timestamp markers like [0:00], [1:30], etc.${commonInstructions}`;
      userMessage = `Analyze this YouTube video: ${videoUrl}`;
    }

    const toolParams: any = {
      type: "object",
      properties: {
        summary: { type: "string" },
        keyConcepts: { type: "array", items: { type: "string" } },
        highlights: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } }, required: ["title", "content"] } },
        difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
        mcqs: { type: "array", items: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } }, correctIndex: { type: "integer" } }, required: ["question", "options", "correctIndex"] } },
        topics: { type: "array", items: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } }, required: ["title", "content"] } },
      },
      required: ["summary", "keyConcepts", "highlights", "notes", "difficulty", "mcqs", "topics"],
      additionalProperties: false,
    };

    // If no real transcript, ask AI to also generate one
    if (!hasRealTranscript) {
      toolParams.properties.transcript = { type: "string", description: "Full transcript with timestamps" };
      toolParams.required.push("transcript");
    }

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
          { role: "user", content: userMessage },
        ],
        tools: [{ type: "function", function: { name: "return_analysis", description: "Return the complete video analysis", parameters: toolParams } }],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned from AI");

    const result = JSON.parse(toolCall.function.arguments);
    // Use real transcript if available
    if (hasRealTranscript) {
      result.transcript = transcript;
    }

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
