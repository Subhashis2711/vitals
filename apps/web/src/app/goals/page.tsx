import { GoalManager } from "@/components/GoalManager";
import { PageHeader } from "@/components/PageHeader";
import { friendlyDate } from "@/lib/date";
import { getGoals, getLearningTopics, getProjects } from "@/lib/api";

export default async function GoalsPage() {
  const [{ goals }, { projects }, { topics }] = await Promise.all([getGoals(), getProjects(), getLearningTopics()]);
  return (
    <div>
      <PageHeader title="Goals" subtitle={friendlyDate()} />
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-500">Each goal carries its own plan — link tasks to it and progress tracks itself.</p>
      <GoalManager initialGoals={goals} projects={projects} topics={topics} />
    </div>
  );
}
