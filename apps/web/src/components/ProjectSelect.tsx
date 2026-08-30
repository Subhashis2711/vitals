"use client";

import type { Project } from "@vitals/shared";
import { cn } from "@/lib/cn";
import { fieldSelectClass } from "@/lib/fieldStyles";

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
      className={cn(fieldSelectClass, className)}
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
