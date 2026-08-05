"use client";

import type { JournalEntry } from "@vitals/shared";
import { Loader2, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { deleteJournalEntry, upsertJournalEntry } from "@/lib/api-browser";
import { todayISO } from "@/lib/date";

export function JournalEditor({
  initialEntries,
  todayEntry,
}: {
  initialEntries: JournalEntry[];
  todayEntry: JournalEntry | null;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [content, setContent] = useState(todayEntry?.content ?? "");
  const [saving, setSaving] = useState(false);
  const today = todayISO();

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const { entry } = await upsertJournalEntry({ date: today, content: content.trim() });
      setEntries((prev) => [entry, ...prev.filter((e) => e.date !== today)]);
      toast.success("Journal entry saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, date: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (date === today) setContent("");
    await deleteJournalEntry(id);
  }

  const pastEntries = entries.filter((e) => e.date !== today);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-200">Today</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What happened today? What are you thinking about?"
          rows={6}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </form>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-200">Past entries</h3>
        <ul className="space-y-2">
          {pastEntries.map((entry) => (
            <li key={entry.id} className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-500">
                  {new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id, entry.date)}
                  className="text-xs text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-300">{entry.content}</p>
            </li>
          ))}
          {pastEntries.length === 0 && <p className="text-sm text-neutral-500">No past entries yet.</p>}
        </ul>
      </div>
    </div>
  );
}
