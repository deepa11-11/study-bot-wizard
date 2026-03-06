import { Lightbulb, Star, BookOpen } from "lucide-react";

interface Props {
  summary: string;
  keyConcepts: string[];
  highlights: string[];
}

export const SummarySection = ({ summary, keyConcepts, highlights }: Props) => (
  <div className="glass-card p-6 space-y-6">
    <div className="flex items-center gap-2">
      <Lightbulb className="w-5 h-5 text-accent" />
      <h2 className="text-xl font-display font-semibold text-foreground">AI Summary</h2>
    </div>

    <p className="text-sm text-secondary-foreground leading-relaxed">{summary}</p>

    <div>
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Key Concepts</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {keyConcepts.map((c, i) => (
          <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
            {c}
          </span>
        ))}
      </div>
    </div>

    <div>
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Highlights</h3>
      </div>
      <ul className="space-y-1">
        {highlights.map((h, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="text-accent">•</span> {h}
          </li>
        ))}
      </ul>
    </div>
  </div>
);
