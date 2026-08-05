import { LearningTopicList } from "@/components/LearningTopicList";
import { PageHeader } from "@/components/PageHeader";
import { getLearningTopics } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function LearningPage() {
  const { topics } = await getLearningTopics();
  return (
    <div>
      <PageHeader title="Learning" subtitle={friendlyDate()} />
      <LearningTopicList initialTopics={topics} />
    </div>
  );
}
