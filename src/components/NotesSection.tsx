import { motion } from "framer-motion";
import { BookMarked, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Props {
  notes: { title: string; content: string }[];
  topics: { title: string; content: string }[];
}

export const NotesSection = ({ notes, topics }: Props) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <BookMarked className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-display font-semibold text-foreground">Structured Notes</h2>
      </div>
      <Accordion type="multiple" className="space-y-2">
        {notes.map((note, i) => (
          <AccordionItem key={i} value={`note-${i}`} className="border-border">
            <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary">
              {note.title}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {note.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <ChevronDown className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-display font-semibold text-foreground">Detected Topics</h2>
      </div>
      <Accordion type="multiple" className="space-y-2">
        {topics.map((topic, i) => (
          <AccordionItem key={i} value={`topic-${i}`} className="border-border">
            <AccordionTrigger className="text-sm font-medium text-foreground hover:text-accent">
              {topic.title}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {topic.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  </div>
);
