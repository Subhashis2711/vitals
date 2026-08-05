import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import TurndownService from "turndown";
import { unified } from "unified";

// Powers the Plain text <-> Markdown toggle: switching format is a real,
// instant, local conversion (not an AI call) — "# Title" typed in Markdown
// mode becomes an actual heading when you flip to Plain text, and vice versa.

const markdownToHtmlProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify);

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return "";
  return String(markdownToHtmlProcessor.processSync(markdown));
}

const turndownService = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
// CommonMark has no underline syntax — keep it as raw HTML (GFM allows
// embedded HTML, and MarkdownPreview renders it via rehype-raw) instead of
// silently dropping the formatting.
turndownService.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `<u>${content}</u>`,
});

export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return "";
  return turndownService.turndown(html).trim();
}
