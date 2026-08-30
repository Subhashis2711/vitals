"use client";

import type { Project } from "@vitals/shared";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createProject } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass } from "@/lib/fieldStyles";
import { modalCloseButtonClass } from "@/lib/modalIconButton";

export function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { project } = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreated(project);
      onClose();
      toast.success(`Created project "${project.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">New project</h3>
          <button type="button" onClick={onClose} title="Close" className={modalCloseButtonClass}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name..."
            className={fieldInputClass}
          />

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional details..."
              className={cn("mt-1", fieldInputClass)}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add project
          </button>
        </form>
      </div>
    </div>
  );
}
