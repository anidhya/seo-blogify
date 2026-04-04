import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import TopicsClient from "./topics-client";
import WorkspaceShell from "@/app/components/workspace-shell";
import Link from "next/link";

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
      topAction={
        <Link
          className="inline-flex items-center justify-center rounded-full border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-4 py-2 text-sm font-medium text-[#0f7b49] transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25"
          href={`/runs/${runId}`}
        >
          Back to workspace
        </Link>
      }
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
