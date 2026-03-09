import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeroSection } from "@/components/HeroSection";
import { VideoInput } from "@/components/VideoInput";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SummarySection } from "@/components/SummarySection";
import { NotesSection } from "@/components/NotesSection";
import { McqSection } from "@/components/McqSection";
import { TimestampQuery } from "@/components/TimestampQuery";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnalysisResult {
  transcript: string;
  summary: string;
  keyConcepts: string[];
  highlights: string[];
  notes: { title: string; content: string }[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  mcqs: { question: string; options: string[]; correctIndex: number }[];
  topics: { title: string; content: string }[];
}

const Index = () => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const handleSubmit = (url: string) => {
    const id = extractVideoId(url);
    if (!id) {
      toast.error("Invalid YouTube URL. Please enter a valid link.");
      return;
    }
    setVideoUrl(url);
    setVideoId(id);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!videoId) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-video", {
        body: { videoId, videoUrl },
      });
      if (error) throw error;
      setResult(data as AnalysisResult);
      toast.success("Analysis complete!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ backgroundImage: "var(--gradient-hero)" }}>
      <LoadingOverlay visible={isAnalyzing} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <HeroSection />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <VideoInput onSubmit={handleSubmit} />
        </motion.div>

        <AnimatePresence>
          {videoId && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8 space-y-8"
            >
              <VideoPlayer videoId={videoId} onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />

              {result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <DifficultyBadge difficulty={result.difficulty} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <TranscriptPanel transcript={result.transcript} />
                    <SummarySection
                      summary={result.summary}
                      keyConcepts={result.keyConcepts}
                      highlights={result.highlights}
                    />
                  </div>

                  <NotesSection notes={result.notes} topics={result.topics} />
                  <McqSection mcqs={result.mcqs} />
                  <TimestampQuery transcript={result.transcript} videoId={videoId} />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-20 pb-8 text-center">
          <p className="text-muted-foreground text-sm">
            AI-Powered YouTube Learning Assistant — Built with Lovable
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
