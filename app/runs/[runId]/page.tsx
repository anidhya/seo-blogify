import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import RunWorkspaceClient from "./run-workspace-client";

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
    <main className="page-shell">
      <RunWorkspaceClient runId={runId} run={run} />
    </main>
  );
}
