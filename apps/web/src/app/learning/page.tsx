import { Plus } from "lucide-react";
import Link from "next/link";
import { LearningTopicList } from "@/components/LearningTopicList";
import { PageHeader } from "@/components/PageHeader";
import { getLearningTopics } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function LearningPage() {
  const { topics } = await getLearningTopics();
  return (
    <div>
      <PageHeader title="Learning" subtitle={friendlyDate()} />
      <div className="mb-4 flex justify-end">
        <Link
          href="/learning/new"
          className="flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
        >
          <Plus className="h-4 w-4" />
          New topic
        </Link>
      </div>
      <LearningTopicList initialTopics={topics} />
    </div>
  );
}
