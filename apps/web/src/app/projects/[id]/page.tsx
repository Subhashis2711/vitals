import type { Project } from "@vitals/shared";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProjectDetail } from "@/components/ProjectDetail";
import { getGoalsByProject, getNotesByDomain, getProject, getTodosByProject } from "@/lib/api";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Next.js doesn't decode a %2F inside a dynamic segment back into a
  // literal "/", so a GID (brain/project/<uuid>) arrives here still encoded.
  const id = decodeURIComponent(rawId);

  let project: Project;
  try {
    ({ project } = await getProject(id));
  } catch {
    notFound();
  }

  const [{ notes }, { todos }, { goals }] = await Promise.all([
    getNotesByDomain("project", id),
    getTodosByProject(id),
    getGoalsByProject(id),
  ]);

  return (
    <div>
      <PageHeader title={project.name} subtitle="Project" />
      <ProjectDetail project={project} notes={notes} todos={todos} goals={goals} />
    </div>
  );
}
