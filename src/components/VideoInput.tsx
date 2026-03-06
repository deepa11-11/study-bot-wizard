import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2 } from "lucide-react";

interface Props {
  onSubmit: (url: string) => void;
}

export const VideoInput = ({ onSubmit }: Props) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 max-w-2xl mx-auto">
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        Paste a YouTube video URL
      </label>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="pl-10 bg-secondary border-border"
          />
        </div>
        <Button type="submit" variant="hero" size="lg">
          Load Video
        </Button>
      </div>
    </form>
  );
};
