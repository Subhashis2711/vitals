"use client";

import type { Project } from "@vitals/shared";
import { Folder, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createProject, deleteProject } from "@/lib/api-browser";
import { cn } from "@/lib/cn";

const COLOR_OPTIONS = ["#f97316", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

export function ProjectManager({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }, [projects, search]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { project } = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      setProjects((prev) => [project, ...prev]);
      setName("");
      setDescription("");
      toast.success(`Created project "${project.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, projectName: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await deleteProject(id);
    toast(`Deleted "${projectName}"`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name..."
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        <div className="flex items-center gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn("h-5 w-5 rounded-full border-2", color === c ? "border-neutral-100" : "border-transparent")}
              style={{ backgroundColor: c }}
              aria-label={`Choose color ${c}`}
            />
          ))}
        </div>
      </form>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none"
        />
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleProjects.map((project) => (
          <li key={project.id} className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-3 transition-colors hover:border-neutral-700">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/projects/${project.id}`} className="flex min-w-0 flex-1 items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color ?? "#a3a3a3" }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-100">{project.name}</p>
                  {project.description && <p className="mt-0.5 truncate text-sm text-neutral-400">{project.description}</p>}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(project.id, project.name)}
                className="shrink-0 text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
        {visibleProjects.length === 0 && (
          <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-10 text-sm text-neutral-500 sm:col-span-2">
            <Folder className="h-6 w-6" />
            {projects.length === 0 ? "No projects yet." : "No projects match your search."}
          </li>
        )}
      </ul>
    </div>
  );
}
