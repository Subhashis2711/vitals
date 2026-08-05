// Deterministic markdown -> plaintext conversion (no AI call). Strips
// Markdown syntax while preserving the underlying text content.
export function markdownToPlainText(markdown: string): string {
  let text = markdown;

  // Fenced code blocks: drop the fence markers, keep the code content.
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (_match, code: string) => code);
  // Inline code
  text = text.replace(/`([^`]+)`/g, "$1");
  // Images: ![alt](url) -> alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links: [text](url) -> text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Headings
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Bold/italic/strikethrough
  text = text.replace(/(\*\*\*|___)(.*?)\1/g, "$2");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  // Blockquotes
  text = text.replace(/^>\s?/gm, "");
  // List markers
  text = text.replace(/^(\s*)[-*+]\s+/gm, "$1");
  text = text.replace(/^(\s*)\d+\.\s+/gm, "$1");
  // Horizontal rules
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})\s*$/gm, "");
  // Table pipes / separator rows
  text = text.replace(/^\s*\|?[\s:-]+\|[\s:-|]*$/gm, "");
  text = text.replace(/\|/g, " ");

  // Tidy whitespace
  text = text.replace(/[ \t]+$/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
