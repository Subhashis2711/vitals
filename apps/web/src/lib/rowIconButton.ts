import { cn } from "./cn";

// Shared hover-reveal row-action style — the majority pattern for delete
// icons inside list rows and cards across the app. Callers layer their own
// positioning (`-m-1.5`, `absolute right-1.5 top-1.5`, `shrink-0`) via `cn`.
export const rowIconButtonClass =
  "p-1.5 text-neutral-400 dark:text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100";

// TodoBoard's deliberately different list-row baseline: always-visible (not
// hover-reveal) with a resting color, chosen earlier this session specifically
// so a row's primary/danger actions don't rely on hover to be discoverable.
// Kept as its own opt-in family — not merged into rowIconButtonClass — since
// most of the app's lists intentionally still use the quieter hover-reveal
// style.
export function listRowActionButtonClass(variant: "danger" | "primary") {
  return cn(
    "transition-colors",
    variant === "danger"
      ? "text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
      : "text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300",
  );
}
