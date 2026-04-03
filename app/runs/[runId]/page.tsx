import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import RunWorkspaceClient from "./run-workspace-client";
import WorkspaceShell from "@/app/components/workspace-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function RunWorkspacePage({ params }: PageProps) {
  const { runId } = await params;
  const run = await loadRun(runId);

  if (!run.input) {
    notFound();
  }

  return (
    <WorkspaceShell
      title="Run Workspace"
      subtitle="Review analysis, approve topics, and manage approved articles."
      navItems={[
        { label: "Analysis", href: "#analysis", icon: "analysis", active: true, status: run.analysis ? "complete" : "idle" },
        { label: "Topics", href: "#topics", icon: "topics", status: run.topics?.topics?.length ? "complete" : "idle" },
        {
          label: "Articles",
          href: "#articles",
          icon: "articles",
          status: run.approvedArticles?.articles?.length ? "complete" : "idle"
        }
      ]}
    >
      <RunWorkspaceClient runId={runId} run={run} />
    </WorkspaceShell>
  );
}
