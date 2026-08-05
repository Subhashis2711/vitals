import type { Goal, Todo } from "@vitals/shared";
import { notFound } from "next/navigation";
import { GoalDetail } from "@/components/GoalDetail";
import { PageHeader } from "@/components/PageHeader";
import { getGoal, getLearningTopics, getProjects } from "@/lib/api";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Next.js doesn't decode a %2F inside a dynamic segment back into a
  // literal "/", so a GID (brain/goal/<uuid>) arrives here still encoded.
  const id = decodeURIComponent(rawId);

  let goal: Goal;
  let todos: Todo[];
  try {
    ({ goal, todos } = await getGoal(id));
  } catch {
    notFound();
  }

  const [{ projects }, { topics }] = await Promise.all([getProjects(), getLearningTopics()]);

  return (
    <div>
      <PageHeader title={goal.title} subtitle="Goal" />
      <GoalDetail goal={goal} todos={todos} projects={projects} topics={topics} />
    </div>
  );
}
