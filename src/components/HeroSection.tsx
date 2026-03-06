import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";

export const HeroSection = () => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center pt-12"
  >
    <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6">
      <Sparkles className="w-4 h-4 text-accent" />
      <span className="text-sm text-muted-foreground">AI-Powered Learning</span>
    </div>

    <div className="flex items-center justify-center gap-3 mb-4">
      <Brain className="w-10 h-10 text-primary" />
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display gradient-text">
        YouTube Learning Assistant
      </h1>
    </div>

    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
      Transform any YouTube video into structured notes, summaries, quizzes, and more — powered by AI.
    </p>
  </motion.div>
);
