import Link from "next/link";
import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import WorkspaceShell from "@/app/components/workspace-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function ArticlesPage({ params }: PageProps) {
  const { runId } = await params;
  const run = await loadRun(runId);

  if (!run.input) {
    notFound();
  }

  const articles = run.approvedArticles?.articles ?? [];

  return (
    <WorkspaceShell
      title="Approved Articles"
      subtitle="All generated articles with independent feedback and regeneration loops."
      backHref={`/runs/${runId}`}
      backLabel="Workspace"
      breadcrumbs={[
        { label: "Sync", href: "/" },
        { label: "Workspace", href: `/runs/${runId}` },
        { label: "Articles", active: true }
      ]}
      topAction={null}
      navItems={[
        { label: "Analysis", href: `/runs/${runId}`, icon: "analysis", status: run.analysis ? "complete" : "idle" },
        { label: "Topics", href: `/runs/${runId}/topics`, icon: "topics", status: run.topics?.topics?.length ? "complete" : "idle" },
        { label: "Articles", href: `/runs/${runId}/articles`, icon: "articles", active: true, status: articles.length ? "complete" : "idle" }
      ]}
    >
      <section className="grid gap-4">
        <div className="surface-shell grid gap-3 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Articles</p>
            <h1 className="mt-1 font-display text-3xl tracking-[-0.04em] text-zinc-900 dark:text-zinc-50">Approved articles</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Open the preview, review LinkedIn, or continue feedback from the left rail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
              {articles.length} total
            </span>
            <span className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-xs font-semibold text-[#0f7b49] dark:text-[#86efac]">
              {articles.filter((article) => article.approvalStatus === "needs_revision").length} need review
            </span>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="surface-shell p-6 text-sm text-zinc-600 dark:text-zinc-300">No approved articles yet.</div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {articles.map((article) => (
              <article key={article.articleSlug} className="rounded-[12px] border border-black/10 bg-white/95 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4 max-md:flex-col">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{article.blog.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{article.blog.summary}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#0f7b49]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0f7b49] dark:text-[#86efac]">
                    {article.approvalStatus}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>Topic: {article.topic.title}</span>
                  <span>Quality: {article.quality.score}%</span>
                  <span>Feedback: {article.feedbackCount}</span>
                  <span>
                    LinkedIn:{" "}
                    {run.linkedin?.articles.find((item) => item.articleSlug === article.articleSlug)?.draft?.reviewStatus ??
                      "pending"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
                    href={`/runs/${runId}/blog/${article.articleSlug}`}
                  >
                    Open preview
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-xl border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-4 py-2 text-sm font-medium text-[#0f7b49] transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:text-[#86efac]"
                    href={`/runs/${runId}/blog/${article.articleSlug}/linkedin`}
                  >
                    LinkedIn
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
