"use client";

import type { Goal, LearningTopic, Project } from "@vitals/shared";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ProjectSelect } from "@/components/ProjectSelect";
import { TopicSelect } from "@/components/TopicSelect";
import { createGoal } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass } from "@/lib/fieldStyles";
import { modalCloseButtonClass } from "@/lib/modalIconButton";

export function NewGoalModal({
  projects,
  topics,
  onClose,
  onCreated,
}: {
  projects: Project[];
  topics: LearningTopic[];
  onClose: () => void;
  onCreated: (goal: Goal) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { goal } = await createGoal({
        title: title.trim(),
        projectId: projectId || undefined,
        topicId: topicId || undefined,
        targetDate: targetDate || undefined,
      });
      onCreated(goal);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create goal");
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
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">New goal</h3>
          <button type="button" onClick={onClose} title="Close" className={modalCloseButtonClass}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's the goal?"
            className={fieldInputClass}
          />

          {projects.length > 0 && (
            <label className="block text-xs text-neutral-600 dark:text-neutral-500">
              Project
              <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} className="mt-1 w-full" />
            </label>
          )}

          {topics.length > 0 && (
            <label className="block text-xs text-neutral-600 dark:text-neutral-500">
              Topic
              <TopicSelect topics={topics} value={topicId} onChange={setTopicId} className="mt-1 w-full" />
            </label>
          )}

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Target date
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={cn("mt-1", fieldInputClass)}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add goal
          </button>
        </form>
      </div>
    </div>
  );
}
