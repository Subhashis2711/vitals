import type { Goal, Todo } from "@vitals/shared";
import { notFound } from "next/navigation";
import { GoalDetail } from "@/components/GoalDetail";
import { PageHeader } from "@/components/PageHeader";
import { getGoal, getGoals, getLearningTopics, getProjects } from "@/lib/api";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let goal: Goal;
  let todos: Todo[];
  try {
    ({ goal, todos } = await getGoal(id));
  } catch {
    notFound();
  }

  const [{ projects }, { topics }, { goals }] = await Promise.all([getProjects(), getLearningTopics(), getGoals()]);

  return (
    <div>
      <PageHeader title={`${goal.reference} · ${goal.title}`} subtitle="Goal" />
      <GoalDetail goal={goal} todos={todos} projects={projects} topics={topics} goals={goals} />
    </div>
  );
}
