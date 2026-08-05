import type { LucideIcon } from "lucide-react";

const ACCENTS = {
  orange: "bg-orange-500/15 text-orange-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  blue: "bg-blue-500/15 text-blue-400",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "orange",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ACCENTS[accent]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-neutral-500">{label}</p>
        <p className="text-lg font-semibold text-neutral-100">{value}</p>
      </div>
    </div>
  );
}
