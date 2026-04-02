import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import LinkedInWorkflowClient from "./linkedin-workflow-client";

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
    <main className="mx-auto min-h-screen max-w-[min(1600px,80vw)] px-5 py-7 max-lg:max-w-full">
      <LinkedInWorkflowClient runId={runId} slug={slug} run={run} />
    </main>
  );
}
