import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm bg-elevated px-2 text-xs font-medium text-muted",
        className,
      )}
      {...props}
    />
  );
}
