import type { Project } from "@vitals/shared";

export function ProjectBadge({ project }: { project: Project | null | undefined }) {
  if (!project) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color ?? "#a3a3a3" }} />
      {project.name}
    </span>
  );
}
