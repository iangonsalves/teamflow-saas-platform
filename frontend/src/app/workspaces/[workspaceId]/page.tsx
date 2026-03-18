import { WorkspaceDetailShell } from "@/components/workspace-detail-shell";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;

  return <WorkspaceDetailShell workspaceId={workspaceId} />;
}
