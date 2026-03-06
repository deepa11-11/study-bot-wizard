import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  transcript: string;
  videoId: string;
}

export const TimestampQuery = ({ transcript, videoId }: Props) => {
  const [timestamp, setTimestamp] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timestamp.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("timestamp-query", {
        body: { timestamp: timestamp.trim(), transcript, videoId },
      });
      if (error) throw error;
      setExplanation(data.explanation);
    } catch (e: any) {
      toast.error(e.message || "Failed to get explanation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-display font-semibold text-foreground">Timestamp Query</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Enter a timestamp (e.g. 3:20) to get an AI explanation of that section.
      </p>

      <form onSubmit={handleQuery} className="flex gap-3">
        <Input
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          placeholder="e.g. 3:20"
          className="max-w-[200px] bg-secondary border-border"
        />
        <Button type="submit" variant="glass" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Query
        </Button>
      </form>

      {explanation && (
        <div className="rounded-lg bg-secondary/50 p-4 border border-border">
          <p className="text-sm text-secondary-foreground leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
};
