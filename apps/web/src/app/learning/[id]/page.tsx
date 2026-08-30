import type { LearningTopicDetail as LearningTopicDetailData } from "@vitals/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LearningTopicDetailClient } from "@/components/LearningTopicDetailClient";
import { PageHeader } from "@/components/PageHeader";
import { getLearningTopicDetail } from "@/lib/api";

export default async function LearningTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Next.js doesn't decode a %2F inside a dynamic segment back into a
  // literal "/", so a GID (brain/learning/<uuid>) arrives here still encoded.
  const id = decodeURIComponent(rawId);

  let detail: LearningTopicDetailData;
  try {
    detail = await getLearningTopicDetail(id);
  } catch {
    notFound();
  }

  return (
    <div>
      <PageHeader title={detail.topic.title} subtitle="Learning topic" />
      <Link href="/learning" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300">
        <ArrowLeft className="h-4 w-4" />
        Back to learning
      </Link>
      <LearningTopicDetailClient
        topic={detail.topic}
        initialRoadmap={detail.roadmap}
        initialResources={detail.resources}
        initialInsights={detail.insights}
      />
    </div>
  );
}
