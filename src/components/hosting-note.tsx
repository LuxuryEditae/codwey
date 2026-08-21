import { HOSTING_NOTE } from "@/lib/legal";
import { cn } from "@/lib/utils";

export function HostingNote({ className }: { className?: string }) {
  return <p className={cn("text-xs leading-relaxed text-subtle", className)}>{HOSTING_NOTE}</p>;
}
