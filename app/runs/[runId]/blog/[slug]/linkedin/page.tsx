import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import LinkedInWorkflowClient from "./linkedin-workflow-client";
import WorkspaceShell from "@/app/components/workspace-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    runId: string;
    slug: string;
  }>;
};

export default async function LinkedInPage({ params }: PageProps) {
  const { runId, slug } = await params;
  const run = await loadRun(runId);

  const approvedArticle = run.approvedArticles?.articles.find((article) => article.articleSlug === slug) ?? null;
  const blog = approvedArticle?.blog ?? (run.blog?.blog?.slug === slug ? run.blog.blog : null);

  if (!blog) {
    notFound();
  }

  return (
    <WorkspaceShell
      title="LinkedIn Pack"
      subtitle="Generate carousel prompts, review images, and publish the approved post."
      navItems={[
        { label: "Pack", href: "#pack", icon: "articles", active: true, status: "complete" },
        { label: "Images", href: "#images", icon: "preview", status: "complete" },
        { label: "Controls", href: "#controls", icon: "analysis", status: "complete" },
        { label: "Review", href: "#review", icon: "publish", status: "complete" }
      ]}
    >
      <LinkedInWorkflowClient runId={runId} slug={slug} run={run} />
    </WorkspaceShell>
  );
}
