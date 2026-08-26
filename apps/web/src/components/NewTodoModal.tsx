"use client";

import type { Goal, Project, RecurrenceFreq, Todo } from "@vitals/shared";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GoalSelect } from "@/components/GoalSelect";
import { ProjectSelect } from "@/components/ProjectSelect";
import { RecurrencePicker } from "@/components/RecurrencePicker";
import { createTodo } from "@/lib/api-browser";

export function NewTodoModal({
  projects,
  goals,
  onClose,
  onCreated,
}: {
  projects: Project[];
  goals: Goal[];
  onClose: () => void;
  onCreated: (todo: Todo) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq | null>(null);
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[] | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { todo } = await createTodo({
        title: title.trim(),
        projectId: projectId || undefined,
        goalId: goalId || undefined,
        dueDate: dueDate || undefined,
        recurrenceFreq,
        recurrenceDaysOfWeek,
        description: description.trim() || undefined,
      });
      onCreated(todo);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create todo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200">New todo</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
          />

          {projects.length > 0 && (
            <label className="block text-xs text-neutral-500">
              Project
              <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} className="mt-1 w-full" />
            </label>
          )}

          {goals.length > 0 && (
            <label className="block text-xs text-neutral-500">
              Goal
              <GoalSelect goals={goals} value={goalId} onChange={setGoalId} className="mt-1 w-full" />
            </label>
          )}

          <label className="block text-xs text-neutral-500">
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-cyan-400/60 focus:outline-none"
            />
          </label>

          <label className="block text-xs text-neutral-500">
            Repeat
            <div className="mt-1">
              <RecurrencePicker
                freq={recurrenceFreq}
                daysOfWeek={recurrenceDaysOfWeek}
                onChange={(freq, daysOfWeek) => {
                  setRecurrenceFreq(freq);
                  setRecurrenceDaysOfWeek(daysOfWeek);
                }}
              />
            </div>
          </label>

          <label className="block text-xs text-neutral-500">
            Notes
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional details..."
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add todo
          </button>
        </form>
      </div>
    </div>
  );
}
