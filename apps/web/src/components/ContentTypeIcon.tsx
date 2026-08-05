import type { NoteContentType } from "@vitals/shared";
import { FileText, Lightbulb, Newspaper, Video } from "lucide-react";

const ICONS: Record<NoteContentType, typeof Newspaper> = {
  article: Newspaper,
  video: Video,
  idea: Lightbulb,
  paste: FileText,
};

export function ContentTypeIcon({ type, className }: { type: NoteContentType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className} />;
}
