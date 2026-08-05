import type { LearningTopicDetail as LearningTopicDetailData } from "@vitals/shared";
import { notFound } from "next/navigation";
import { LearningTopicDetail } from "@/components/LearningTopicDetail";
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
      <LearningTopicDetail
        topic={detail.topic}
        initialRoadmap={detail.roadmap}
        initialResources={detail.resources}
        initialInsights={detail.insights}
      />
    </div>
  );
}
