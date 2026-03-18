import { ProjectDetailShell } from "@/components/project-detail-shell";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return <ProjectDetailShell projectId={projectId} />;
}
