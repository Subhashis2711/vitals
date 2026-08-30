"use client";

import type { Goal, LearningResource, LearningTopic, Note } from "@vitals/shared";
import { BookOpen, CheckSquare, ExternalLink, Plus, Square, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  addLearningResource,
  createGoal,
  createNote,
  deleteGoal,
  deleteLearningResource,
  deleteNote,
  updateGoal,
} from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass, fieldInputCompactClass } from "@/lib/fieldStyles";
import { rowIconButtonClass } from "@/lib/rowIconButton";

// Roadmap steps are goals scoped to this topic (topicId), and insights are
// notes scoped to this topic (domain: "learning", domainId: topicId) — see
// packages/db/src/repositories/learning.ts.
export function LearningTopicDetail({
  topic,
  initialRoadmap,
  initialResources,
  initialInsights,
}: {
  topic: LearningTopic;
  initialRoadmap: Goal[];
  initialResources: LearningResource[];
  initialInsights: Note[];
}) {
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [resources, setResources] = useState(initialResources);
  const [insights, setInsights] = useState(initialInsights);

  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [insightText, setInsightText] = useState("");
  const [savingInsight, setSavingInsight] = useState(false);

  async function handleAddRoadmap(e: FormEvent) {
    e.preventDefault();
    if (!roadmapTitle.trim()) return;
    const { goal } = await createGoal({ title: roadmapTitle.trim(), topicId: topic.id });
    setRoadmap((prev) => [...prev, goal]);
    setRoadmapTitle("");
  }

  async function handleToggleRoadmap(goal: Goal) {
    const { goal: updated } = await updateGoal(goal.id, { status: goal.status === "done" ? "todo" : "done" });
    setRoadmap((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleDeleteRoadmap(id: string) {
    setRoadmap((prev) => prev.filter((r) => r.id !== id));
    await deleteGoal(id);
  }

  async function handleAddResource(e: FormEvent) {
    e.preventDefault();
    if (!resourceName.trim()) return;
    const { resource } = await addLearningResource(topic.id, {
      name: resourceName.trim(),
      url: resourceUrl.trim() || undefined,
    });
    setResources((prev) => [resource, ...prev]);
    setResourceName("");
    setResourceUrl("");
  }

  async function handleDeleteResource(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
    await deleteLearningResource(id);
  }

  async function submitInsight() {
    if (!insightText.trim()) return;
    setSavingInsight(true);
    try {
      const { note } = await createNote({ content: insightText.trim(), domain: "learning", domainId: topic.id });
      setInsights((prev) => [note, ...prev]);
      setInsightText("");
    } finally {
      setSavingInsight(false);
    }
  }

  async function handleDeleteInsight(id: string) {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await deleteNote(id);
  }

  const done = roadmap.filter((r) => r.status === "done").length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            Roadmap — what to learn
          </h3>
          <span className="text-xs text-neutral-600 dark:text-neutral-500">
            {done}/{roadmap.length}
          </span>
        </div>
        <ul className="mb-3 space-y-1.5">
          {roadmap.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-2 text-sm"
            >
              <button
                type="button"
                onClick={() => handleToggleRoadmap(item)}
                className="text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300"
              >
                {item.status === "done" ? (
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span className={cn("flex-1 text-neutral-800 dark:text-neutral-200", item.status === "done" && "text-neutral-600 dark:text-neutral-500 line-through")}>
                {item.title}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteRoadmap(item.id)}
                className={cn(rowIconButtonClass, "-m-1.5")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {roadmap.length === 0 && <li className="text-xs text-neutral-600 dark:text-neutral-500">No roadmap items yet.</li>}
        </ul>
        <form onSubmit={handleAddRoadmap} className="flex gap-2">
          <input
            value={roadmapTitle}
            onChange={(e) => setRoadmapTitle(e.target.value)}
            placeholder="Add a step..."
            className={cn(fieldInputCompactClass, "min-w-0 flex-1")}
          />
          <button
            type="submit"
            disabled={!roadmapTitle.trim()}
            className="rounded-lg bg-cyan-400 px-3 py-2 text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Resources</h3>
        <ul className="mb-3 space-y-1.5">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="group flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-2 text-sm"
            >
              {resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center gap-1.5 truncate text-neutral-800 dark:text-neutral-200 hover:text-cyan-600 dark:text-cyan-300"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {resource.name}
                </a>
              ) : (
                <span className="flex-1 truncate text-neutral-800 dark:text-neutral-200">{resource.name}</span>
              )}
              <button
                type="button"
                onClick={() => handleDeleteResource(resource.id)}
                className={cn(rowIconButtonClass, "-m-1.5")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {resources.length === 0 && <li className="text-xs text-neutral-600 dark:text-neutral-500">No resources yet.</li>}
        </ul>
        <form onSubmit={handleAddResource} className="flex flex-wrap gap-2">
          <input
            value={resourceName}
            onChange={(e) => setResourceName(e.target.value)}
            placeholder="Resource name..."
            className={cn(fieldInputCompactClass, "min-w-0 flex-1")}
          />
          <input
            value={resourceUrl}
            onChange={(e) => setResourceUrl(e.target.value)}
            placeholder="Link (optional)"
            className={cn(fieldInputCompactClass, "min-w-0 flex-1")}
          />
          <button
            type="submit"
            disabled={!resourceName.trim()}
            className="rounded-lg bg-cyan-400 px-3 py-2 text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Insights & notes</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitInsight();
          }}
          className="mb-3 space-y-2"
        >
          <textarea
            value={insightText}
            onChange={(e) => setInsightText(e.target.value)}
            placeholder="Something you just understood, a formula, a gotcha... (⌘+Enter to save)"
            rows={3}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submitInsight();
              }
            }}
            className={fieldInputClass}
          />
          <button
            type="submit"
            disabled={savingInsight || !insightText.trim()}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            Save
          </button>
        </form>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="group relative rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-3 text-xs text-neutral-700 dark:text-neutral-300"
            >
              <p className="whitespace-pre-wrap">{insight.content}</p>
              <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-600">{new Date(insight.createdAt).toLocaleDateString()}</p>
              <button
                type="button"
                onClick={() => handleDeleteInsight(insight.id)}
                className={cn(rowIconButtonClass, "absolute right-0.5 top-0.5")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
