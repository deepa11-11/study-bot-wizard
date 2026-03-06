import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Props {
  transcript: string;
}

export const TranscriptPanel = ({ transcript }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    toast.success("Transcript copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-semibold text-foreground">Transcript</h2>
        </div>
        <Button onClick={handleCopy} variant="glass" size="sm">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <ScrollArea className="h-[400px] rounded-md">
        <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-wrap">
          {transcript}
        </p>
      </ScrollArea>
    </div>
  );
};
