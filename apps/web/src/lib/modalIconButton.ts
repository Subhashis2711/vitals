import { cn } from "./cn";

// Shared close (X) button style for every modal header — a circular hit
// target, not just a bare icon, so the dismiss affordance looks and feels
// the same everywhere instead of drifting per-modal.
export const modalCloseButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

// Shared save (tick) button style — solid cyan once there's something to
// save, muted/flat otherwise, so "is there anything to save right now" reads
// the same way in every modal that has one.
export function modalSaveButtonClass(enabled: boolean) {
  return cn(
    "flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:pointer-events-none",
    enabled
      ? "bg-cyan-400 text-white shadow-sm shadow-cyan-400/30 hover:bg-cyan-500"
      : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600",
  );
}

// Shared delete (trash) button style for modal/detail-page headers — same
// circular hit target as close/save, so the three header actions read as one
// family instead of delete looking like an afterthought bolted on elsewhere.
export const modalDeleteButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400";
