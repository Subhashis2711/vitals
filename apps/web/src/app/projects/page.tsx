import { ProjectManager } from "@/components/ProjectManager";
import { PageHeader } from "@/components/PageHeader";
import { getProjects } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function ProjectsPage() {
  const { projects } = await getProjects();
  return (
    <div>
      <PageHeader title="Projects" subtitle={friendlyDate()} />
      <ProjectManager initialProjects={projects} />
    </div>
  );
}
