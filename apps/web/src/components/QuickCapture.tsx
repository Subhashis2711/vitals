"use client";

import type { CaptureNoteResponse } from "@vitals/shared";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ContentTypeIcon } from "@/components/ContentTypeIcon";
import { captureNote } from "@/lib/api-browser";

export function QuickCapture() {
  const router = useRouter();
  const [rawContent, setRawContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptureNoteResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rawContent.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await captureNote({
        rawContent: rawContent.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
      });
      setResult(res);
      setRawContent("");
      setSourceUrl("");
      toast.success(`Captured "${res.note.title}"`, {
        description:
          res.todos.length > 0 ? `${res.todos.length} todo${res.todos.length === 1 ? "" : "s"} extracted` : undefined,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        <Sparkles className="h-4 w-4 text-amber-400" />
        Quick capture
      </h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={rawContent}
          onChange={(e) => setRawContent(e.target.value)}
          placeholder="Paste an article, a thought, a URL..."
          rows={4}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
        />
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600 dark:text-neutral-500" />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Source URL (optional)"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 py-2 pl-9 pr-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !rawContent.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-400"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Capturing..." : "Capture"}
        </button>
      </form>

      {result && (
        <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
              <ContentTypeIcon type={result.note.contentType} className="h-3 w-3" />
              {result.note.contentType}
            </span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{result.note.title}</span>
          </div>
          {result.note.aiSummary && <p className="mt-2 text-neutral-700 dark:text-neutral-300">{result.note.aiSummary}</p>}
          {result.note.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {result.note.tags.map((tag) => (
                <span key={tag} className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {result.todos.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500">Extracted todos</p>
              <ul className="mt-1 list-inside list-disc text-neutral-700 dark:text-neutral-300">
                {result.todos.map((todo) => (
                  <li key={todo.id}>{todo.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
