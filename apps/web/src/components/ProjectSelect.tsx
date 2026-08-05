"use client";

import type { Project } from "@vitals/shared";
import { cn } from "@/lib/cn";

export function ProjectSelect({
  projects,
  value,
  onChange,
  className,
  placeholder = "No project",
}: {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-300 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}
