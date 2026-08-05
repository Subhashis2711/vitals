"use client";

import type { LearningTopic } from "@vitals/shared";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createLearningTopic, deleteLearningTopic } from "@/lib/api-browser";

export function LearningTopicList({ initialTopics }: { initialTopics: LearningTopic[] }) {
  const [topics, setTopics] = useState(initialTopics);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const visibleTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? topics.filter((t) => t.title.toLowerCase().includes(q)) : topics;
  }, [topics, search]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { topic } = await createLearningTopic({ title: title.trim() });
      setTopics((prev) => [topic, ...prev]);
      setTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create topic");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, topicTitle: string) {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    await deleteLearningTopic(id);
    toast(`Deleted "${topicTitle}"`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New learning topic..."
          className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleTopics.map((topic) => (
          <div key={topic.id} className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <Link href={`/learning/${encodeURIComponent(topic.id)}`} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-100">{topic.title}</p>
                <p className="text-xs text-neutral-500">
                  last touched {new Date(topic.lastTouchedAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(topic.id, topic.title)}
              className="absolute right-3 top-3 text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {visibleTopics.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-10 text-sm text-neutral-500 sm:col-span-2">
            <BookOpen className="h-6 w-6" />
            {topics.length === 0 ? "No topics yet." : "No topics match your search."}
          </div>
        )}
      </div>
    </div>
  );
}
