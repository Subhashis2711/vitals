import { PageHeader } from "@/components/PageHeader";
import { TodoBoard } from "@/components/TodoBoard";
import { getProjects, getTodos } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function TodosPage() {
  const [{ todos }, { projects }] = await Promise.all([getTodos(), getProjects()]);
  return (
    <div>
      <PageHeader title="Todos" subtitle={friendlyDate()} />
      <TodoBoard initialTodos={todos} projects={projects} />
    </div>
  );
}
