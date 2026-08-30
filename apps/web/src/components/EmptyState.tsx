import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// Shared empty-state treatment — baseline is the Projects/Goals/Learning
// dashed-card style. `as` lets it drop into either a <ul> (as an <li>) or a
// plain container; `className` carries grid-specific overrides like
// `sm:col-span-2`.
export function EmptyState({
  icon: Icon,
  message,
  as: Tag = "div",
  variant = "dashed",
  className,
}: {
  icon: LucideIcon;
  message: string;
  as?: "div" | "li";
  variant?: "dashed" | "plain";
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl py-10 text-center text-sm text-neutral-600 dark:text-neutral-500",
        variant === "dashed" && "border border-dashed border-neutral-200 dark:border-neutral-800",
        className,
      )}
    >
      <Icon className="h-6 w-6" />
      {message}
    </Tag>
  );
}
