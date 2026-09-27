import type { Project } from "@vitals/shared";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProjectDetail } from "@/components/ProjectDetail";
import { getGoalsByProject, getNotesByDomain, getProject, getTodosByProject } from "@/lib/api";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let project: Project;
  try {
    ({ project } = await getProject(id));
  } catch {
    notFound();
  }

  const [{ notes }, { todos }, { goals }] = await Promise.all([
    getNotesByDomain("project", project.id),
    getTodosByProject(project.id),
    getGoalsByProject(project.id),
  ]);

  return (
    <div>
      <PageHeader title={`${project.key} · ${project.name}`} subtitle="Project" />
      <ProjectDetail project={project} notes={notes} todos={todos} goals={goals} />
    </div>
  );
}
