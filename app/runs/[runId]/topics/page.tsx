import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import TopicsClient from "./topics-client";
import WorkspaceShell from "@/app/components/workspace-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function TopicsPage({ params }: PageProps) {
  const { runId } = await params;
  const run = await loadRun(runId);

  if (!run.input) {
    notFound();
  }

  return (
    <WorkspaceShell
      title="Topic Queue"
      subtitle="Generate and approve topics from the brand analysis."
      backHref={`/runs/${runId}`}
      backLabel="Workspace"
      breadcrumbs={[
        { label: "Sync", href: "/" },
        { label: "Workspace", href: `/runs/${runId}` },
        { label: "Topics", active: true }
      ]}
      topAction={null}
      navItems={[
        { label: "Analysis", href: `/runs/${runId}`, icon: "analysis", status: run.analysis ? "complete" : "idle" },
        { label: "Topics", href: `/runs/${runId}/topics`, icon: "topics", active: true, status: run.topics?.topics?.length ? "complete" : "idle" },
        {
          label: "Articles",
          href: `/runs/${runId}/articles`,
          icon: "articles",
          status: run.approvedArticles?.articles?.length ? "complete" : "idle"
        }
      ]}
    >
      <TopicsClient runId={runId} run={run} />
    </WorkspaceShell>
  );
}
