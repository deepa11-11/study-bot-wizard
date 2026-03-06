import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Props {
  visible: boolean;
}

export const LoadingOverlay = ({ visible }: Props) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-display">
            AI is analyzing your video...
          </p>
          <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "50%" }}
            />
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
