"use client";

import { GOAL_STATUSES, type Goal, type LearningTopic, type Project, type Todo } from "@vitals/shared";
import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CircularProgress } from "@/components/CircularProgress";
import { EditableTodoList } from "@/components/EditableTodoList";
import { ProjectSelect } from "@/components/ProjectSelect";
import { TopicSelect } from "@/components/TopicSelect";
import { createTodo, deleteGoal, updateGoal } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputCompactClass, fieldLabelClass, fieldSelectClass } from "@/lib/fieldStyles";

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function GoalDetail({
  goal: initialGoal,
  todos: initialTodos,
  projects,
  topics,
}: {
  goal: Goal;
  todos: Todo[];
  projects: Project[];
  topics: LearningTopic[];
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [todos, setTodos] = useState(initialTodos);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [status, setStatus] = useState(goal.status);
  const [projectId, setProjectId] = useState(goal.projectId ?? "");
  const [topicId, setTopicId] = useState(goal.topicId ?? "");
  const [goalTitle, setGoalTitle] = useState(goal.title);
  const [goalDescription, setGoalDescription] = useState(goal.description ?? "");
  const [saving, setSaving] = useState(false);

  const progress =
    todos.length > 0 ? Math.round((todos.filter((t) => t.status === "done").length / todos.length) * 100) : 0;

  const dirty =
    status !== goal.status ||
    projectId !== (goal.projectId ?? "") ||
    topicId !== (goal.topicId ?? "") ||
    goalTitle.trim() !== goal.title ||
    goalDescription.trim() !== (goal.description ?? "");

  async function handleSave() {
    if (!dirty || !goalTitle.trim()) return;
    setSaving(true);
    try {
      const { goal: updated } = await updateGoal(goal.id, {
        status,
        projectId: projectId || null,
        topicId: topicId || null,
        title: goalTitle.trim(),
        description: goalDescription.trim() || null,
      });
      setGoal((prev) => ({ ...prev, ...updated }));
      toast.success("Goal saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save goal");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTodo(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { todo } = await createTodo({ title: title.trim(), goalId: goal.id });
      setTodos((prev) => [todo, ...prev]);
      setTitle("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGoal() {
    await deleteGoal(goal.id);
    toast(`Deleted "${goal.title}"`);
    router.push("/goals");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <CircularProgress value={progress} size={72} strokeWidth={6} />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <label className={fieldLabelClass}>Title</label>
              <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} className={fieldInputCompactClass} />
            </div>
            <div>
              <label className={fieldLabelClass}>Description</label>
              <textarea
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                rows={2}
                placeholder="What does success look like?"
                className={fieldInputCompactClass}
              />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-500">
              {goal.startDate ? `${goal.startDate} – ` : ""}
              {goal.targetDate ?? "No target date"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Goal["status"])}
            className={cn(fieldSelectClass, "py-1.5")}
          >
            {GOAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {projects.length > 0 && <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} className="py-1.5" />}
          {topics.length > 0 && <TopicSelect topics={topics} value={topicId} onChange={setTopicId} className="py-1.5" />}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty || !goalTitle.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleDeleteGoal}
            className="flex items-center gap-1 text-xs text-neutral-600 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete goal
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Linked tasks</h3>
        <form onSubmit={handleAddTodo} className="mb-3 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task toward this goal..."
            className={cn(fieldInputCompactClass, "min-w-0 flex-1")}
          />
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
        <p className="mb-2 text-xs text-neutral-400 dark:text-neutral-600">Double-click a task to rename it · use the arrows to reorder.</p>
        <EditableTodoList todos={todos} onChange={setTodos} emptyMessage="No tasks linked yet." />
      </div>
    </div>
  );
}
