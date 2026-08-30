"use client";

import { NOTE_CONTENT_TYPES, type Note, type NoteContentType, type Project, type Todo } from "@vitals/shared";
import {
  Bold,
  CheckCircle2,
  Circle,
  Download,
  Eraser,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  Save,
  Trash2,
  Underline,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { ProjectSelect } from "@/components/ProjectSelect";
import { Field } from "@/components/form/Field";
import {
  createNote,
  createTodo,
  deleteNote,
  deleteTodo,
  markdownFromText,
  markdownToText,
  updateNote,
  updateTodo,
} from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass } from "@/lib/fieldStyles";
import { rowIconButtonClass } from "@/lib/rowIconButton";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdownHtml";

const CONTENT_TYPE_LABELS: Record<NoteContentType, string> = {
  article: "Article",
  video: "Video",
  idea: "Idea",
  paste: "Paste",
};

type Format = "plain" | "markdown";
type View = "edit" | "preview";
type FontFamily = "sans" | "serif" | "mono";

const FONT_FAMILY_CLASS: Record<FontFamily, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};
const FONT_PREF_KEY = "vitals:note-editor-font";
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 28;

function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "note"
  );
}

// Strips tags from the plain-text editor's HTML so we never send raw HTML
// soup to the Gemini prompt or into a downloaded .md file — both expect text.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<(br|\/div|\/p|\/li)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasContent(value: string): boolean {
  return value.replace(/<[^>]*>/g, "").trim().length > 0;
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === opt.value ? "bg-cyan-400 text-white" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      // Without this, the button steals focus (and clears the editor's text
      // selection) before onClick fires, so execCommand would have nothing
      // to act on.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-cyan-400/20 text-cyan-600 dark:text-cyan-300" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-neutral-100 dark:bg-neutral-800" />;
}

interface NoteEditorProps {
  mode: "create" | "edit";
  projects: Project[];
  note?: Note;
  initialLinkedTodos?: Todo[];
  onSaved?: (note: Note) => void;
  onCancel?: () => void;
}

export function NoteEditor({ mode, projects, note, initialLinkedTodos, onSaved, onCancel }: NoteEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [summary, setSummary] = useState(note?.aiSummary ?? "");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [sourceUrl, setSourceUrl] = useState(note?.sourceUrl ?? "");
  const [contentType, setContentType] = useState<NoteContentType>(note?.contentType ?? "idea");
  const [projectId, setProjectId] = useState(note?.domain === "project" ? (note.domainId ?? "") : "");

  const [format, setFormat] = useState<Format>("markdown");
  const [view, setView] = useState<View>("edit");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [fontSize, setFontSize] = useState(15);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [blockFormat, setBlockFormat] = useState("P");

  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [stripping, setStripping] = useState(false);

  const [todos, setTodos] = useState<Todo[]>(initialLinkedTodos ?? []);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);

  const richEditorRef = useRef<HTMLDivElement>(null);
  const wasPlainRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(FONT_PREF_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { family?: FontFamily; size?: number };
      if (parsed.family) setFontFamily(parsed.family);
      if (parsed.size) setFontSize(parsed.size);
    } catch {
      // ignore malformed local storage value
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FONT_PREF_KEY, JSON.stringify({ family: fontFamily, size: fontSize }));
  }, [fontFamily, fontSize]);

  // Seed the contentEditable's HTML only when *entering* plain mode, never
  // on every keystroke — otherwise resetting innerHTML from state on each
  // render would clobber the browser's own cursor position.
  useEffect(() => {
    if (format === "plain" && !wasPlainRef.current && richEditorRef.current) {
      // Make new lines produce real <p> tags instead of Chrome's default
      // <div>-per-line, so they pick up .rich-text's paragraph styling and
      // convert cleanly to markdown paragraphs.
      document.execCommand("defaultParagraphSeparator", false, "p");
      richEditorRef.current.innerHTML = content;
    }
    wasPlainRef.current = format === "plain";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  function updateActiveFormats() {
    const next = new Set<string>();
    if (document.queryCommandState("bold")) next.add("bold");
    if (document.queryCommandState("italic")) next.add("italic");
    if (document.queryCommandState("underline")) next.add("underline");
    if (document.queryCommandState("insertUnorderedList")) next.add("ul");
    if (document.queryCommandState("insertOrderedList")) next.add("ol");
    setActiveFormats(next);
  }

  function execFormat(command: string, value?: string) {
    richEditorRef.current?.focus();
    document.execCommand(command, false, value);
    setContent(richEditorRef.current?.innerHTML ?? "");
    updateActiveFormats();
  }

  // The Plain text / Markdown toggle is a real, instant, local conversion —
  // not just a different editing surface for the same untouched string.
  function handleFormatChange(next: Format) {
    if (next === format) return;
    setContent((prev) => (next === "plain" ? markdownToHtml(prev) : htmlToMarkdown(prev)));
    setBlockFormat("P");
    setFormat(next);
  }

  async function handleFormat() {
    const plainSource = htmlToPlainText(content);
    if (!plainSource) return;
    setFormatting(true);
    try {
      const { markdown } = await markdownFromText(plainSource);
      setContent(markdown);
      setFormat("markdown");
      toast.success("Reformatted with AI");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't format content");
    } finally {
      setFormatting(false);
    }
  }

  async function handleStrip() {
    if (!content.trim()) return;
    setStripping(true);
    try {
      const { text } = await markdownToText(content);
      setContent(text);
      setFormat("plain");
      toast.success("Formatting stripped");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't strip formatting");
    } finally {
      setStripping(false);
    }
  }

  function handleExport() {
    const exportText = format === "plain" ? htmlToPlainText(content) : content;
    const blob = new Blob([exportText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(title)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !hasContent(content)) return;
    setSaving(true);
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      if (mode === "create") {
        const { note: created } = await createNote({
          title: title.trim(),
          content,
          contentType,
          sourceUrl: sourceUrl.trim() || undefined,
          aiSummary: summary.trim() || undefined,
          tags: parsedTags,
          domain: "project",
          domainId: projectId || undefined,
        });
        toast.success(`Saved "${created.title}"`);
        router.push(`/notes/${encodeURIComponent(created.id)}`);
      } else if (note) {
        const { note: updated } = await updateNote(note.id, {
          title: title.trim(),
          content,
          contentType,
          sourceUrl: sourceUrl.trim() || null,
          aiSummary: summary.trim() || null,
          tags: parsedTags,
          domain: "project",
          domainId: projectId || null,
        });
        toast.success("Note saved");
        if (onSaved) {
          onSaved(updated);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        toast.error("Couldn't reach the API server — check it's still running.");
      } else {
        toast.error(err instanceof Error ? err.message : "Couldn't save note");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote() {
    if (!note) return;
    await deleteNote(note.id);
    toast(`Deleted "${note.title ?? "Untitled"}"`);
    router.push("/notes");
  }

  async function handleAddTodo(e: FormEvent) {
    e.preventDefault();
    if (!newTodoTitle.trim() || !note) return;
    setAddingTodo(true);
    try {
      const { todo } = await createTodo({ title: newTodoTitle.trim(), sourceNoteId: note.id });
      setTodos((prev) => [todo, ...prev]);
      setNewTodoTitle("");
    } finally {
      setAddingTodo(false);
    }
  }

  async function toggleTodo(todo: Todo) {
    const nextStatus = todo.status === "done" ? "todo" : "done";
    const { todo: updated } = await updateTodo(todo.id, { status: nextStatus });
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDeleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await deleteTodo(id);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled note"
            className={cn(fieldInputClass, "text-base font-medium")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Type">
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as NoteContentType)}
              className={fieldInputClass}
            >
              {NOTE_CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CONTENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} className={fieldInputClass} />
          </Field>
          <Field label="Source URL">
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className={fieldInputClass}
            />
          </Field>
        </div>

        <Field label="Summary">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="A short summary of this note (optional)"
            rows={2}
            className={fieldInputClass}
          />
        </Field>

        <Field label="Tags">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags, comma separated"
            className={fieldInputClass}
          />
        </Field>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedToggle
              value={format}
              onChange={handleFormatChange}
              options={[
                { value: "plain", label: "Plain text" },
                { value: "markdown", label: "Markdown" },
              ]}
            />
            {format === "markdown" && (
              <SegmentedToggle
                value={view}
                onChange={setView}
                options={[
                  { value: "edit", label: "Edit" },
                  { value: "preview", label: "Preview" },
                ]}
              />
            )}
          </div>

          {format === "plain" ? (
            <div className="overflow-hidden rounded-xl border border-neutral-300/80 dark:border-neutral-700/80 shadow-inner shadow-black/20">
              <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-1.5">
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                  title="Font family"
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 focus:border-cyan-400/60 focus:outline-none"
                >
                  <option value="sans">Sans</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Mono</option>
                </select>

                <div className="ml-1 flex items-center gap-0.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-0.5">
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.max(MIN_FONT_SIZE, s - 1))}
                    className="flex h-6 w-6 items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                    title="Decrease font size"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs text-neutral-700 dark:text-neutral-300">{fontSize}</span>
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.min(MAX_FONT_SIZE, s + 1))}
                    className="flex h-6 w-6 items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                    title="Increase font size"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <ToolbarDivider />

                <select
                  value={blockFormat}
                  onChange={(e) => {
                    setBlockFormat(e.target.value);
                    execFormat("formatBlock", e.target.value);
                  }}
                  title="Text style"
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 focus:border-cyan-400/60 focus:outline-none"
                >
                  <option value="P">Paragraph</option>
                  <option value="H1">Heading 1</option>
                  <option value="H2">Heading 2</option>
                  <option value="H3">Heading 3</option>
                  <option value="H4">Heading 4</option>
                </select>

                <ToolbarDivider />

                <ToolbarButton icon={Bold} label="Bold" active={activeFormats.has("bold")} onClick={() => execFormat("bold")} />
                <ToolbarButton
                  icon={Italic}
                  label="Italic"
                  active={activeFormats.has("italic")}
                  onClick={() => execFormat("italic")}
                />
                <ToolbarButton
                  icon={Underline}
                  label="Underline"
                  active={activeFormats.has("underline")}
                  onClick={() => execFormat("underline")}
                />

                <ToolbarDivider />

                <ToolbarButton
                  icon={List}
                  label="Bullet list"
                  active={activeFormats.has("ul")}
                  onClick={() => execFormat("insertUnorderedList")}
                />
                <ToolbarButton
                  icon={ListOrdered}
                  label="Numbered list"
                  active={activeFormats.has("ol")}
                  onClick={() => execFormat("insertOrderedList")}
                />
              </div>
              <div
                ref={richEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                onMouseUp={updateActiveFormats}
                onKeyUp={updateActiveFormats}
                data-placeholder="Write your note..."
                style={{ fontSize }}
                className={cn(
                  "rich-text min-h-[19.5rem] w-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900/60 px-3.5 py-2.5 leading-relaxed text-neutral-900 dark:text-neutral-100 focus:outline-none",
                  "empty:before:text-neutral-600 dark:text-neutral-500 empty:before:content-[attr(data-placeholder)]",
                  FONT_FAMILY_CLASS[fontFamily],
                )}
              />
            </div>
          ) : view === "edit" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Write your markdown here..."
              rows={14}
              className={cn(fieldInputClass, "font-mono leading-relaxed")}
            />
          ) : (
            <div className="min-h-[20rem] rounded-xl border border-neutral-300/80 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-3 shadow-inner shadow-black/20">
              <MarkdownPreview content={content || "*Nothing to preview yet.*"} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-0.5">
            {format === "markdown" && (
              <button
                type="button"
                onClick={handleStrip}
                disabled={stripping || !content.trim()}
                className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300 disabled:opacity-50"
                title="Deterministically strip markdown syntax (no AI) and switch to Plain text"
              >
                {stripping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eraser className="h-3 w-3" />}
                Strip formatting
              </button>
            )}
            {format === "plain" && (
              <button
                type="button"
                onClick={handleFormat}
                disabled={formatting || !hasContent(content)}
                className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300 disabled:opacity-50"
                title="Ask Gemini to infer markdown structure and switch to Markdown"
              >
                {formatting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                Format with AI
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={!hasContent(content)}
              className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300 disabled:opacity-50"
              title="Download the current content as a .md file"
            >
              <Download className="h-3 w-3" />
              Export as .md
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving || !title.trim() || !hasContent(content)}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : mode === "create" ? "Save note" : "Save changes"}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            )}
          </div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDeleteNote}
              className="flex items-center gap-1 text-xs text-neutral-600 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete note
            </button>
          )}
        </div>
      </form>

      {mode === "edit" && note && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Linked todos</h3>
          <form onSubmit={handleAddTodo} className="mb-3 flex gap-2">
            <input
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Add a todo from this note..."
              className={cn(fieldInputClass, "flex-1")}
            />
            <button
              type="submit"
              disabled={addingTodo || !newTodoTitle.trim()}
              className="flex shrink-0 items-center gap-1 rounded-xl bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <ul className="space-y-1.5">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-2 text-sm"
              >
                <button type="button" onClick={() => toggleTodo(todo)} className="text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300">
                  {todo.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
                <span className={cn("flex-1 text-neutral-800 dark:text-neutral-200", todo.status === "done" && "text-neutral-600 dark:text-neutral-500 line-through")}>
                  {todo.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTodo(todo.id)}
                  className={rowIconButtonClass}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {todos.length === 0 && <li className="text-xs text-neutral-600 dark:text-neutral-500">No todos linked to this note yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
