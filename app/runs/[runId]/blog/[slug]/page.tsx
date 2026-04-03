import { loadRun } from "@/lib/storage";
import { notFound } from "next/navigation";
import BlogActions from "./blog-actions";
import CopyButton from "./copy-button";
import EditableArticleCard from "./editable-article-card";
import WorkspaceShell from "@/app/components/workspace-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    runId: string;
    slug: string;
  }>;
};

export default async function BlogPreviewPage({ params }: PageProps) {
  const { runId, slug } = await params;
  const run = await loadRun(runId);

  const approvedArticle = run.approvedArticles?.articles.find((article) => article.articleSlug === slug) ?? null;
  const blog = approvedArticle?.blog ?? (run.blog?.blog?.slug === slug ? run.blog.blog : null);

  if (!blog) {
    notFound();
  }

  const quality = approvedArticle?.quality ?? run.quality?.quality;
  const manifest = run.manifest;
  const notes = (run.regenerationNotes?.notes ?? []).filter((note) => note.articleSlug === slug);
  const revisions = (run.revisions?.revisions ?? []).filter((revision) => revision.articleSlug === slug);
  const approvals = (run.approvals?.approvals ?? []).filter((approval) => approval.articleSlug === slug);
  const canApprove = quality?.publishStatus === "publish_ready";
  const latestApproval = approvals[approvals.length - 1];

  return (
    <WorkspaceShell
      title="Article Preview"
      subtitle={blog.title}
      topAction={
        latestApproval?.approved ? (
          <a
            className="inline-flex items-center justify-center rounded-full border border-[#8b5cf6]/20 bg-[#f5f3ff] px-4 py-2 text-sm font-medium text-[#6d28d9] transition hover:-translate-y-0.5 hover:bg-[#ede9fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25"
            href={`/runs/${runId}/blog/${slug}/linkedin`}
          >
            Open LinkedIn workflow
          </a>
        ) : null
      }
      navItems={[
        { label: "Article", href: "#article", icon: "preview", active: true, status: quality?.publishStatus === "publish_ready" ? "complete" : "needs_review" },
        { label: "SEO", href: "#seo", icon: "analysis", status: "complete" },
        { label: "Takeaways", href: "#takeaways", icon: "topics", status: "complete" },
        { label: "History", href: "#history", icon: "publish", status: latestApproval ? "complete" : "idle" },
        { label: "Images", href: "#images", icon: "articles", status: "complete" },
        { label: "Links", href: "#links", icon: "sync", status: "complete" }
      ]}
    >
      <section className="grid gap-4 rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-5 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
        <div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm text-neutral-600 backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c35d2e]" />
            Blog preview
          </div>
          <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-neutral-900 md:text-6xl">{blog.title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600 md:text-base">{blog.summary}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div id="article" className="grid gap-4 rounded-3xl border border-black/10 bg-[#fffaf2] p-4 scroll-mt-24">
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Article status</h2>
                  <div className="mt-3 grid gap-1 text-sm text-neutral-600">
                    <p>Publish status: {quality?.publishStatus ?? "draft"}</p>
                    <p>Quality score: {quality?.score ?? "n/a"}</p>
                    <p>Word count: {approvedArticle?.wordCount ?? run.blog?.wordCount ?? "n/a"}</p>
                    <p>Run ID: {runId}</p>
                    <p>Workflow status: {manifest?.status ?? "unknown"}</p>
                    <p>Approval state: {latestApproval ? latestApproval.publishStatus : "pending"}</p>
                  </div>
                </div>
              </div>
              <BlogActions runId={runId} slug={slug} canApprove={canApprove} />
            </div>

          <div className="grid gap-4">
            <div id="seo" className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4 scroll-mt-24">
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">SEO Meta</h2>
                  <p className="mt-1 text-sm text-neutral-600">Copy this block or reuse it in the CMS.</p>
                </div>
                <CopyButton
                  label="Copy meta"
                  text={`Title: ${blog.meta.title}\nDescription: ${blog.meta.description}\nKeywords: ${blog.meta.keywords.join(", ")}`}
                />
              </div>
              <div className="mt-3 grid gap-2 text-sm text-neutral-600">
                <p>
                  <strong className="text-neutral-900">Title:</strong> {blog.meta.title}
                </p>
                <p>
                  <strong className="text-neutral-900">Description:</strong> {blog.meta.description}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {blog.meta.keywords.map((keyword) => (
                  <span className="rounded-full bg-[#f2d1c3] px-3 py-1 text-xs font-medium text-[#7e3614]" key={keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div id="takeaways" className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4 scroll-mt-24">
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Key Takeaways</h2>
                  <p className="mt-1 text-sm text-neutral-600">Copy the core points as a quick export note.</p>
                </div>
                <CopyButton label="Copy takeaways" text={blog.keyTakeaways.join("\n")} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {blog.keyTakeaways.map((takeaway) => (
                  <span className="rounded-full bg-[#f2d1c3] px-3 py-1 text-xs font-medium text-[#7e3614]" key={takeaway}>
                    {takeaway}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div id="history" className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4 scroll-mt-24">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Approval history</h2>
              </div>
              <CopyButton
                label="Copy approvals"
                text={approvals
                  .map(
                    (approval) =>
                      `${approval.approved ? "Approved" : "Needs revision"} | ${approval.notes || "n/a"} | ${approval.score ?? "n/a"}`
                  )
                  .join("\n")}
              />
            </div>
            {approvals.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No approval decisions yet.</p> : null}
            <div className="mt-3 grid gap-3">
              {approvals.map((approval) => (
                <div key={approval.approvalId} className="rounded-2xl border border-black/10 bg-white/80 p-3">
                  <p className="text-sm text-neutral-600">
                    <strong className="text-neutral-900">Decision:</strong> {approval.approved ? "Approved" : "Needs revision"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    <strong className="text-neutral-900">Notes:</strong> {approval.notes || "n/a"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    <strong className="text-neutral-900">Quality score:</strong> {approval.score ?? "n/a"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div id="images" className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4 scroll-mt-24">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Regeneration History</h2>
              </div>
              <CopyButton
                label="Copy history"
                text={notes
                  .map(
                    (note) =>
                      `${note.comments}\nPrior: ${note.priorScore ?? "n/a"}\nResult: ${note.resultingScore ?? "n/a"}\nStatus: ${note.publishStatus}`
                  )
                  .join("\n\n")}
              />
            </div>
            {notes.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No regeneration notes yet.</p> : null}
            <div className="mt-3 grid gap-3">
              {notes.map((note) => (
                <div key={note.revisionId} className="rounded-2xl border border-black/10 bg-white/80 p-3">
                  <p className="text-sm text-neutral-600">
                    <strong className="text-neutral-900">Comments:</strong> {note.comments}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    <strong className="text-neutral-900">Prior score:</strong> {note.priorScore ?? "n/a"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    <strong className="text-neutral-900">Resulting score:</strong> {note.resultingScore ?? "n/a"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    <strong className="text-neutral-900">Status:</strong> {note.publishStatus}
                  </p>
                </div>
              ))}
            </div>
            {revisions.length > 0 ? <p className="mt-3 text-sm text-neutral-500">Saved revisions: {revisions.length}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div id="links" className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4 scroll-mt-24">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Image Prompts</h2>
                <p className="mt-1 text-sm text-neutral-600">Three consistent prompts for later image generation in Nano Banana Pro.</p>
              </div>
              <CopyButton label="Copy prompts" text={blog.imagePrompts.join("\n\n")} />
            </div>
            <div className="mt-3 grid gap-3">
              {blog.imagePrompts.map((prompt, index) => (
                <div key={`${index}-${prompt}`} className="rounded-2xl border border-black/10 bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Prompt {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">{prompt || "n/a"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Internal Link Suggestions</h2>
                <p className="mt-1 text-sm text-neutral-600">SEO-oriented anchors for strengthening site structure.</p>
              </div>
              <CopyButton
                label="Copy links"
                text={blog.internalLinks
                  .map(
                    (link) =>
                      `${link.anchorText} -> ${link.targetUrl}\nPlacement: ${link.placement}\nWhy: ${link.rationale}`
                  )
                  .join("\n\n")}
              />
            </div>
            <div className="mt-3 grid gap-3">
              {blog.internalLinks.length === 0 ? (
                <p className="text-sm text-neutral-600">No link suggestions generated.</p>
              ) : (
                blog.internalLinks.map((link) => (
                  <div key={`${link.anchorText}-${link.targetUrl}`} className="rounded-2xl border border-black/10 bg-white/80 p-3">
                    <p className="text-sm text-neutral-700">
                      <strong className="text-neutral-900">Anchor:</strong> {link.anchorText}
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">
                      <strong className="text-neutral-900">Target:</strong> {link.targetUrl}
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">
                      <strong className="text-neutral-900">Placement:</strong> {link.placement}
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">
                      <strong className="text-neutral-900">Why:</strong> {link.rationale}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <EditableArticleCard runId={runId} articleSlug={slug} markdown={blog.markdown} />

        <article className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
          <div className="flex items-start justify-between gap-4 max-md:flex-col">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">FAQs</h2>
              <p className="mt-1 text-sm text-neutral-600">Frequently asked questions included in the article.</p>
            </div>
            <CopyButton
              label="Copy FAQs"
              text={blog.faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n")}
            />
          </div>
          <div className="mt-4 grid gap-4">
            {blog.faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-black/10 bg-white/80 p-4">
                <strong className="block text-sm text-neutral-900">{faq.question}</strong>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </WorkspaceShell>
  );
}
