import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import RunWorkspaceClient from "./run-workspace-client";
import WorkspaceShell from "@/app/components/workspace-shell";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ runId: string }> };

export default async function RunWorkspacePage({ params }: PageProps) {
  const { runId } = await params;
  const run = await loadRun(runId);

  if (!run.input) notFound();

  const hasAnalysis = !!run.analysis;
  const hasTopics = !!(run.topics?.topics?.length);
  const hasArticles = !!(run.approvedArticles?.articles?.length);
  const companyName = run.input.companyName || "Brand workspace";

  return (
    <WorkspaceShell
      title={companyName}
      backHref="/profiles"
      backLabel="Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/profiles" },
        { label: companyName, active: true }
      ]}
      navItems={[
        { label: "New project", href: "/", icon: "sync" },
        { label: "Dashboard", href: "/profiles", icon: "articles" },
        {
          label: "Analysis",
          href: `/runs/${runId}`,
          icon: "analysis",
          active: true,
          status: hasAnalysis ? "complete" : "idle"
        },
        {
          label: "Topics",
          href: `/runs/${runId}/topics`,
          icon: "topics",
          status: hasTopics ? "complete" : hasAnalysis ? "idle" : "idle"
        },
        {
          label: "Articles",
          href: `/runs/${runId}/articles`,
          icon: "articles",
          status: hasArticles ? "complete" : "idle"
        }
      ]}
    >
      <RunWorkspaceClient runId={runId} run={run} />
    </WorkspaceShell>
  );
}
