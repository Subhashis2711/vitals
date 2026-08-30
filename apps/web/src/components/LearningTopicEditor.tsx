"use client";

import type { LearningTopic } from "@vitals/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createLearningTopic, updateLearningTopic } from "@/lib/api-browser";
import { fieldInputClass, fieldLabelClass } from "@/lib/fieldStyles";

type Props =
  | { mode: "create" }
  | { mode: "edit"; topic: LearningTopic; onSaved: (topic: LearningTopic) => void; onCancel: () => void };

export function LearningTopicEditor(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.mode === "edit" ? props.topic.title : "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (props.mode === "create") {
        const { topic } = await createLearningTopic({ title: title.trim() });
        router.push(`/learning/${encodeURIComponent(topic.id)}`);
      } else {
        const { topic } = await updateLearningTopic(props.topic.id, { title: title.trim() });
        toast.success("Topic saved");
        props.onSaved(topic);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save topic");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div>
        <label className={fieldLabelClass}>Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to learn?"
          className={fieldInputClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : props.mode === "create" ? "Create topic" : "Save changes"}
        </button>
        {props.mode === "edit" && (
          <button
            type="button"
            onClick={props.onCancel}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
