"use client";

import type { JournalEntry } from "@vitals/shared";
import { Loader2, NotebookPen, Pencil, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { deleteJournalEntry, upsertJournalEntry } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/date";
import { fieldInputClass } from "@/lib/fieldStyles";
import { rowIconButtonClass } from "@/lib/rowIconButton";

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setEditingContent(entry.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingContent("");
  }

  async function handleSaveEdit(entry: JournalEntry) {
    if (!editingContent.trim()) return;
    setSavingEdit(true);
    try {
      const { entry: updated } = await upsertJournalEntry({ date: entry.date, content: editingContent.trim() });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)));
      setEditingId(null);
      setEditingContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save entry");
    } finally {
      setSavingEdit(false);
    }
  }

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
      <form onSubmit={handleSave} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Today</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What happened today? What are you thinking about?"
          rows={6}
          className={fieldInputClass}
        />
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </form>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Past entries</h3>
        <ul className="space-y-2">
          {pastEntries.map((entry) => (
            <li key={entry.id} className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-500">
                  {new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="flex items-center gap-1">
                  {editingId !== entry.id && (
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className={cn(rowIconButtonClass, "-m-1.5 hover:text-cyan-600 dark:hover:text-cyan-300")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id, entry.date)}
                    className={cn(rowIconButtonClass, "-m-1.5")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={4}
                    className={fieldInputClass}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(entry)}
                      disabled={savingEdit || !editingContent.trim()}
                      className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{entry.content}</p>
              )}
            </li>
          ))}
          {pastEntries.length === 0 && <EmptyState as="li" icon={NotebookPen} message="No past entries yet." />}
        </ul>
      </div>
    </div>
  );
}
