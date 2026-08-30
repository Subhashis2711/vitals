import { LearningTopicEditor } from "@/components/LearningTopicEditor";
import { PageHeader } from "@/components/PageHeader";
import { friendlyDate } from "@/lib/date";

export default function NewLearningTopicPage() {
  return (
    <div>
      <PageHeader title="New learning topic" subtitle={friendlyDate()} />
      <LearningTopicEditor mode="create" />
    </div>
  );
}
