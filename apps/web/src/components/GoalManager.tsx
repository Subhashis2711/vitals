"use client";

import { GOAL_STATUSES, type Goal, type LearningTopic, type Project } from "@vitals/shared";
import { ChevronDown, ChevronUp, Plus, Search, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CircularProgress } from "@/components/CircularProgress";
import { NewGoalModal } from "@/components/NewGoalModal";
import { ProjectBadge } from "@/components/ProjectBadge";
import { ProjectSelect } from "@/components/ProjectSelect";
import { ReferenceBadge } from "@/components/ReferenceBadge";
import { deleteGoal, reorderGoals } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { rowIconButtonClass } from "@/lib/rowIconButton";

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-neutral-400/15 dark:bg-neutral-500/15 text-neutral-500 dark:text-neutral-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  done: "bg-emerald-500/15 text-emerald-400",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function GoalManager({
  initialGoals,
  projects,
  topics,
}: {
  initialGoals: Goal[];
  projects: Project[];
  topics: LearningTopic[];
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterProjectId, setFilterProjectId] = useState("");

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const visibleGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return goals.filter((g) => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (filterProjectId && g.projectId !== filterProjectId) return false;
      if (q && !g.reference.toLowerCase().includes(q) && !g.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [goals, search, statusFilter, filterProjectId]);

  async function handleDelete(id: string, goalTitle: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await deleteGoal(id);
    toast(`Deleted "${goalTitle}"`);
  }

  async function moveGoal(goal: Goal, direction: "up" | "down") {
    const index = visibleGoals.findIndex((item) => item.id === goal.id);
    const neighbor = direction === "up" ? visibleGoals[index - 1] : visibleGoals[index + 1];
    if (!neighbor) return;

    const goalPosition = goal.position;
    const neighborPosition = neighbor.position;
    setGoals((prev) => prev.map((item) => {
      if (item.id === goal.id) return { ...item, position: neighborPosition };
      if (item.id === neighbor.id) return { ...item, position: goalPosition };
      return item;
    }));
    try {
      const { goals: updated } = await reorderGoals(goal.id, neighbor.id);
      setGoals((prev) => prev.map((item) => updated.find((next) => next.id === item.id) ?? item));
    } catch (err) {
      setGoals((prev) => prev.map((item) => {
        if (item.id === goal.id) return { ...item, position: goalPosition };
        if (item.id === neighbor.id) return { ...item, position: neighborPosition };
        return item;
      }));
      toast.error(err instanceof Error ? err.message : "Couldn't reorder goal");
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        New goal
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600 dark:text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search goals..."
            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1.5 pl-8 pr-3 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>
        {projects.length > 0 && (
          <ProjectSelect
            projects={projects}
            value={filterProjectId}
            onChange={setFilterProjectId}
            placeholder="All projects"
            className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1.5 text-sm"
          />
        )}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === "all" ? "bg-cyan-400 text-white" : "bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200",
            )}
          >
            All
          </button>
          {GOAL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === s ? "bg-cyan-400 text-white" : "bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200",
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleGoals.map((goal, index) => (
          <div key={goal.id} className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
            <Link href={`/goals/${encodeURIComponent(goal.reference)}`} className="flex items-center gap-3">
              <CircularProgress value={goal.progress} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
                  <p className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
                    <ReferenceBadge reference={goal.reference} className="mr-2" />
                    {goal.title}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[goal.status]}`}
                  >
                    {STATUS_LABELS[goal.status]}
                  </span>
                  <span className="shrink-0">
                    <ProjectBadge project={goal.projectId ? projectById.get(goal.projectId) : undefined} />
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-500">
                  {goal.todoCount > 0 ? `${goal.doneTodoCount}/${goal.todoCount} tasks` : "No linked tasks yet"}
                  {goal.targetDate ? ` · due ${goal.targetDate}` : ""}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(goal.id, goal.title)}
              className={cn(rowIconButtonClass, "absolute right-1.5 top-1.5")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="absolute bottom-1.5 right-1.5 flex flex-col opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => moveGoal(goal, "up")}
                disabled={index === 0}
                title="Move goal up"
                className="-m-1.5 p-1.5 text-neutral-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-600 dark:hover:text-cyan-300"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveGoal(goal, "down")}
                disabled={index === visibleGoals.length - 1}
                title="Move goal down"
                className="-m-1.5 p-1.5 text-neutral-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-600 dark:hover:text-cyan-300"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {visibleGoals.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 py-10 text-sm text-neutral-600 dark:text-neutral-500 sm:col-span-2">
            <Target className="h-6 w-6" />
            {goals.length === 0
              ? "No goals yet. Each goal carries its own plan — link tasks to it and progress tracks itself."
              : "No goals match your filters."}
          </div>
        )}
      </div>

      {createOpen && (
        <NewGoalModal
          projects={projects}
          topics={topics}
          onClose={() => setCreateOpen(false)}
          onCreated={(goal) => setGoals((prev) => [goal, ...prev])}
        />
      )}
    </div>
  );
}
