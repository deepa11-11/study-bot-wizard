import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, CheckCircle2, XCircle } from "lucide-react";

interface Mcq {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Props {
  mcqs: Mcq[];
}

export const McqSection = ({ mcqs }: Props) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const selectAnswer = (qIdx: number, oIdx: number) => {
    if (revealed[qIdx]) return;
    setAnswers((a) => ({ ...a, [qIdx]: oIdx }));
    setRevealed((r) => ({ ...r, [qIdx]: true }));
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-display font-semibold text-foreground">Self-Assessment Quiz</h2>
      </div>

      <div className="space-y-6">
        {mcqs.map((mcq, qi) => (
          <motion.div
            key={qi}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: qi * 0.1 }}
            className="space-y-3"
          >
            <p className="text-sm font-medium text-foreground">
              {qi + 1}. {mcq.question}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mcq.options.map((opt, oi) => {
                const isSelected = answers[qi] === oi;
                const isCorrect = mcq.correctIndex === oi;
                const isRevealed = revealed[qi];

                let optionClass =
                  "p-3 rounded-lg border text-sm cursor-pointer transition-all duration-200 ";
                if (isRevealed && isCorrect) {
                  optionClass += "border-beginner bg-beginner/10 text-foreground";
                } else if (isRevealed && isSelected && !isCorrect) {
                  optionClass += "border-destructive bg-destructive/10 text-foreground";
                } else if (isSelected) {
                  optionClass += "border-primary bg-primary/10 text-foreground";
                } else {
                  optionClass += "border-border bg-secondary/50 text-secondary-foreground hover:border-primary/50";
                }

                return (
                  <div
                    key={oi}
                    onClick={() => selectAnswer(qi, oi)}
                    className={optionClass}
                  >
                    <div className="flex items-center gap-2">
                      {isRevealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-beginner" />}
                      {isRevealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-destructive" />}
                      <span>{opt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
