"use client";

import type { Goal, LearningResource, LearningTopic, Note } from "@vitals/shared";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LearningTopicDetail } from "@/components/LearningTopicDetail";
import { LearningTopicEditor } from "@/components/LearningTopicEditor";
import { deleteLearningTopic } from "@/lib/api-browser";
import { modalDeleteButtonClass } from "@/lib/modalIconButton";

export function LearningTopicDetailClient({
  topic: initialTopic,
  initialRoadmap,
  initialResources,
  initialInsights,
}: {
  topic: LearningTopic;
  initialRoadmap: Goal[];
  initialResources: LearningResource[];
  initialInsights: Note[];
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [editing, setEditing] = useState(false);

  async function handleDelete() {
    await deleteLearningTopic(topic.id);
    toast(`Deleted "${topic.title}"`);
    router.push("/learning");
  }

  if (editing) {
    return (
      <LearningTopicEditor
        mode="edit"
        topic={topic}
        onSaved={(updated) => {
          setTopic(updated);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-600 dark:text-cyan-300">
            <BookOpen className="h-4 w-4" />
          </span>
          <h1 className="truncate text-xl font-semibold text-neutral-950 dark:text-neutral-50">{topic.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button type="button" onClick={handleDelete} title="Delete topic" className={modalDeleteButtonClass}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <LearningTopicDetail
        topic={topic}
        initialRoadmap={initialRoadmap}
        initialResources={initialResources}
        initialInsights={initialInsights}
      />
    </div>
  );
}
