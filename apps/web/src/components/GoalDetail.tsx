"use client";

import { GOAL_STATUSES, type Goal, type LearningTopic, type Project, type Todo } from "@vitals/shared";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CircularProgress } from "@/components/CircularProgress";
import { EditableTodoList } from "@/components/EditableTodoList";
import { ProjectSelect } from "@/components/ProjectSelect";
import { TopicSelect } from "@/components/TopicSelect";
import { createTodo, deleteGoal, updateGoal } from "@/lib/api-browser";

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

  const progress =
    todos.length > 0 ? Math.round((todos.filter((t) => t.status === "done").length / todos.length) * 100) : 0;

  async function handleStatusChange(status: string) {
    const { goal: updated } = await updateGoal(goal.id, { status: status as Goal["status"] });
    setGoal((prev) => ({ ...prev, ...updated }));
  }

  async function handleProjectChange(nextProjectId: string) {
    const { goal: updated } = await updateGoal(goal.id, { projectId: nextProjectId || null });
    setGoal((prev) => ({ ...prev, ...updated }));
    toast.success(nextProjectId ? "Linked to project" : "Removed from project");
  }

  async function handleTopicChange(nextTopicId: string) {
    const { goal: updated } = await updateGoal(goal.id, { topicId: nextTopicId || null });
    setGoal((prev) => ({ ...prev, ...updated }));
    toast.success(nextTopicId ? "Linked to learning topic" : "Removed from learning topic");
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
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center gap-4">
          <CircularProgress value={progress} size={72} strokeWidth={6} />
          <div>
            {goal.description && <p className="text-sm text-neutral-400">{goal.description}</p>}
            <p className="mt-1 text-xs text-neutral-500">
              {goal.startDate ? `${goal.startDate} – ` : ""}
              {goal.targetDate ?? "No target date"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <select
            value={goal.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-300 focus:border-orange-500/60 focus:outline-none"
          >
            {GOAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {projects.length > 0 && (
            <ProjectSelect
              projects={projects}
              value={goal.projectId ?? ""}
              onChange={handleProjectChange}
              className="border-neutral-700 bg-neutral-950 py-1.5 text-sm"
            />
          )}
          {topics.length > 0 && (
            <TopicSelect
              topics={topics}
              value={goal.topicId ?? ""}
              onChange={handleTopicChange}
              className="border-neutral-700 bg-neutral-950 py-1.5 text-sm"
            />
          )}
          <button
            type="button"
            onClick={handleDeleteGoal}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete goal
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-200">Linked tasks</h3>
        <form onSubmit={handleAddTodo} className="mb-3 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task toward this goal..."
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
        <p className="mb-2 text-xs text-neutral-600">Double-click a task to rename it · use the arrows to reorder.</p>
        <EditableTodoList todos={todos} onChange={setTodos} emptyMessage="No tasks linked yet." />
      </div>
    </div>
  );
}
