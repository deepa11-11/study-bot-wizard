import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";

interface Props {
  videoId: string;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const VideoPlayer = ({ videoId, onAnalyze, isAnalyzing }: Props) => (
  <div className="glass-card p-6 space-y-4">
    <div className="aspect-video rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube Video"
      />
    </div>
    <div className="flex justify-center">
      <Button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        variant="hero"
        size="lg"
        className="min-w-[200px]"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Analyze Video
          </>
        )}
      </Button>
    </div>
  </div>
);
