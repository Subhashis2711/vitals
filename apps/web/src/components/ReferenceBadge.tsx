import { cn } from "@/lib/cn";

export function ReferenceBadge({ reference, className }: { reference: string; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 font-mono text-[10px] font-semibold tracking-tight text-cyan-700 dark:text-cyan-300",
        className,
      )}
    >
      {reference}
    </span>
  );
}
