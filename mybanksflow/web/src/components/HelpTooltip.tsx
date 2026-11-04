import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HelpTooltipProps {
  title: string;
  lines: string[];
}

export default function HelpTooltip({ title, lines }: HelpTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" align="start">
        <h4 className="font-semibold mb-2">{title}</h4>
        <ul className="space-y-1.5 text-muted-foreground">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
