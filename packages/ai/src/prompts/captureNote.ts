export function buildCaptureNotePrompt(rawContent: string, sourceUrl?: string | null): string {
  return `You are the capture pipeline for a personal "second brain" app. Analyze the raw captured content below and extract structured fields.

${sourceUrl ? `Source URL: ${sourceUrl}\n` : ""}Raw content:
"""
${rawContent}
"""

Classify contentType as one of: article, video, paste, idea.
- "article" for prose/writing captured from the web or elsewhere
- "video" if it's clearly about/from a video (e.g. a YouTube URL or transcript)
- "idea" for short freeform personal thoughts/notes with no clear external source
- "paste" for anything else (code, logs, miscellaneous pasted text)

Write a short, specific title (under 80 characters).
Write a concise 2-4 sentence summary.
Extract 2-6 relevant lowercase tags (single words or short phrases, no leading #).
Extract any concrete action items as short imperative todo titles (e.g. "Email Sarah about the budget"). If there are none, return an empty list.`;
}
