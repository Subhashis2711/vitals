export const fieldInputClass =
  "w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-inner shadow-black/5 transition-all duration-150 hover:border-neutral-400 focus:border-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-400/10 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:shadow-black/20 dark:hover:border-neutral-600";

// Same visual language as fieldInputClass, tighter padding — for inline
// "quick add" rows (e.g. an add-todo input inside a detail page card) where
// the full field size would look oversized next to a compact submit button.
export const fieldInputCompactClass =
  "w-full rounded-xl border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-inner shadow-black/5 transition-all duration-150 hover:border-neutral-400 focus:border-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-400/10 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:shadow-black/20 dark:hover:border-neutral-600";

// Same family for <select> elements — no `w-full` (selects are usually sized
// to their content in filter bars, not stretched across a form row like
// text inputs), otherwise identical colors/radius/ring to fieldInputClass.
export const fieldSelectClass =
  "rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 shadow-inner shadow-black/5 transition-all duration-150 hover:border-neutral-400 focus:border-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-400/10 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-300 dark:shadow-black/20 dark:hover:border-neutral-600";

export const fieldLabelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500";
