import type { ReactNode } from "react";
import { fieldLabelClass } from "@/lib/fieldStyles";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={fieldLabelClass}>{label}</label>
      {children}
    </div>
  );
}
