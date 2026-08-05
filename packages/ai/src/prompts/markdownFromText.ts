export function buildMarkdownFromTextPrompt(text: string): string {
  return `Convert the following plain text into well-structured Markdown. Infer headings, lists, paragraphs, and emphasis from the structure and phrasing of the text — do not invent content that isn't there.

Respond with ONLY the resulting Markdown. No commentary, no surrounding code fence.

Plain text:
"""
${text}
"""`;
}
