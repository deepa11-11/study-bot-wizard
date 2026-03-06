import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface Props {
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

const config = {
  Beginner: { color: "bg-beginner", text: "text-beginner" },
  Intermediate: { color: "bg-intermediate", text: "text-intermediate" },
  Advanced: { color: "bg-advanced", text: "text-advanced" },
};

export const DifficultyBadge = ({ difficulty }: Props) => {
  const c = config[difficulty];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center"
    >
      <div className="glass-card px-6 py-3 flex items-center gap-3">
        <BarChart3 className={`w-5 h-5 ${c.text}`} />
        <span className="text-sm text-muted-foreground">Difficulty:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.color}/20 ${c.text}`}>
          {difficulty}
        </span>
      </div>
    </motion.div>
  );
};
