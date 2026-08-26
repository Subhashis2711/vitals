import { PageHeader } from "@/components/PageHeader";
import { TodoBoard } from "@/components/TodoBoard";
import { getGoals, getProjects, getTodos } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function TodosPage() {
  const [{ todos }, { projects }, { goals }] = await Promise.all([getTodos(), getProjects(), getGoals()]);
  return (
    <div>
      <PageHeader title="Todos" subtitle={friendlyDate()} />
      <TodoBoard initialTodos={todos} projects={projects} goals={goals} />
    </div>
  );
}
