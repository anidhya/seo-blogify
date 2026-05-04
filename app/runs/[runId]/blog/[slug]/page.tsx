import { loadRun } from "@/lib/storage";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import BlogActions from "./blog-actions";
import CopyButton from "./copy-button";
import EditableArticleCard from "./editable-article-card";
import SocialHandoffButton from "./social-handoff-button";
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

  function formatDate(value: string) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function DisclosureCard({
    id,
    title,
    description,
    copyLabel,
    copyText,
    accentClass,
    children,
    defaultOpen = false
  }: {
    id: string;
    title: string;
    description?: string;
    copyLabel?: string;
    copyText?: string;
    accentClass?: string;
    children: ReactNode;
    defaultOpen?: boolean;
  }) {
    return (
      <details
        className={`rounded-[12px] border bg-white/85 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition open:shadow-[0_16px_32px_rgba(15,23,42,0.07)] dark:border-white/8 dark:bg-white/5 ${accentClass ?? "border-black/10"}`}
        open={defaultOpen}
        id={id}
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-[12px] px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${accentClass?.includes("sky")
                    ? "bg-sky-500"
                    : accentClass?.includes("emerald")
                      ? "bg-emerald-500"
                      : accentClass?.includes("violet")
                        ? "bg-violet-500"
                        : accentClass?.includes("amber")
                          ? "bg-amber-500"
                          : accentClass?.includes("rose")
                            ? "bg-rose-500"
                            : "bg-[#0f7b49]"}`
              }
              />
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-zinc-50">{title}</h2>
            </div>
            {description ? <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-zinc-400">{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {copyLabel && copyText ? <CopyButton label={copyLabel} text={copyText} /> : null}
            <span className="mt-0.5 rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              Expand
            </span>
          </div>
        </summary>
        <div className="border-t border-black/10 px-4 py-4 dark:border-white/8">{children}</div>
      </details>
    );
  }

  return (
    <WorkspaceShell
      title="Article Preview"
      subtitle={blog.title}
      backHref={`/runs/${runId}`}
      backLabel="Workspace"
      breadcrumbs={[
        { label: "Sync", href: "/" },
        { label: "Workspace", href: `/runs/${runId}` },
        { label: "Article", active: true }
      ]}
      topAction={
        <div className="flex flex-wrap items-center gap-2">
          <a
            className="inline-flex items-center justify-center rounded-xl border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-4 py-2 text-sm font-medium text-[#0f7b49] transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25"
            href={`/runs/${runId}`}
          >
            Back to workspace
          </a>
          {latestApproval?.approved ? (
            <>
              <SocialHandoffButton runId={runId} slug={slug} />
              <a
                className="inline-flex items-center justify-center rounded-xl border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-4 py-2 text-sm font-medium text-[#0f7b49] transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:text-[#86efac]"
                href={`/runs/${runId}/blog/${slug}/linkedin`}
              >
                Open LinkedIn workflow
              </a>
            </>
          ) : null}
        </div>
      }
      navItems={[
        { label: "Article", href: "#article", icon: "preview", active: true, status: quality?.publishStatus === "publish_ready" ? "complete" : "needs_review" },
        { label: "SEO", href: "#seo", icon: "analysis", status: "complete" },
        { label: "Takeaways", href: "#takeaways", icon: "topics", status: "complete" },
        { label: "History", href: "#history", icon: "publish", status: latestApproval ? "complete" : "idle" },
        { label: "Images", href: "#images", icon: "articles", status: "complete" },
        { label: "Links", href: "#links", icon: "sync", status: "complete" },
        { label: "FAQs", href: "#faqs", icon: "topics", status: "complete" },
        ...(latestApproval?.approved
          ? [{ label: "LinkedIn", href: `/runs/${runId}/blog/${slug}/linkedin`, icon: "linkedin" as const, status: "complete" as const }]
          : [])
      ]}
    >
      <section className="mx-auto grid w-full max-w-[1520px] gap-5 overflow-x-hidden px-4 py-5 md:px-6">
        <div className="rounded-[12px] border border-black/8 bg-white/70 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)] dark:border-white/8 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                Blog preview
              </div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-neutral-900 md:text-4xl dark:text-zinc-50">{blog.title}</h1>
              <p className="mt-2 text-sm leading-6 text-neutral-600 md:text-[15px] dark:text-zinc-400">{blog.summary}</p>
            </div>
            <div className="grid gap-2 text-xs text-neutral-500 dark:text-zinc-400">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 font-medium text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                  {quality?.publishStatus ?? "draft"}
                </span>
                <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 font-medium text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                  Score {quality?.score ?? "n/a"}
                </span>
                <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 font-medium text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                  {approvedArticle?.wordCount ?? run.blog?.wordCount ?? "n/a"} words
                </span>
              </div>
              <p>Run ID: {runId}</p>
              <p>Approval: {latestApproval ? latestApproval.publishStatus : "pending"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="grid min-w-0 gap-4">
            <EditableArticleCard
              runId={runId}
              articleSlug={slug}
              markdown={blog.markdown}
              imagePrompts={blog.imagePrompts}
              internalLinks={blog.internalLinks}
            />
          </div>

          <aside className="grid min-w-0 gap-4 self-start xl:sticky xl:top-4">
            <BlogActions
              runId={runId}
              slug={slug}
              canApprove={canApprove}
              guidelineReviewStatus={quality?.guidelineReview?.status ?? "not_available"}
            />

            <DisclosureCard
              id="brand-guidelines"
              title="Brand Guidelines"
              description={
                run.brandGuidelines
                  ? `Active snapshot ${run.brandGuidelines.snapshot.snapshotId} for ${run.brandGuidelines.domain}`
                  : "No brand guideline files are attached to this brand."
              }
              copyLabel={run.brandGuidelines ? "Copy guidelines" : undefined}
              copyText={
                run.brandGuidelines
                  ? [
                      `Domain: ${run.brandGuidelines.domain}`,
                      `Snapshot: ${run.brandGuidelines.snapshot.snapshotId}`,
                      `Summary: ${run.brandGuidelines.snapshot.summary}`,
                      `Files: ${run.brandGuidelines.snapshot.files.map((file) => file.fileName).join(", ")}`,
                      `Guidance:\n${run.brandGuidelines.snapshot.guidanceText}`
                    ].join("\n")
                  : undefined
              }
              accentClass="border-[#0f7b49]/15 bg-[#0f7b49]/7 dark:border-[#0f7b49]/15 dark:bg-white/5"
            >
              {run.brandGuidelines ? (
                <div className="grid gap-3">
                  <div className="rounded-[12px] border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-white/5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400">
                      Review status
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-zinc-300">
                      {quality?.guidelineReview?.summary ??
                        "This article is being evaluated against the uploaded brand guidelines on each draft and rewrite pass."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-xs font-medium text-[#0f7b49] dark:bg-white/10 dark:text-[#86efac]">
                        {quality?.guidelineReview?.status ?? "not_available"}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                        {run.brandGuidelines.snapshot.files.length} file
                        {run.brandGuidelines.snapshot.files.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {run.brandGuidelines.snapshot.files.map((file) => (
                      <div key={file.fileId} className="rounded-[12px] border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-white/5">
                        <p className="text-sm font-medium text-neutral-900 dark:text-zinc-50">{file.fileName}</p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-400">
                          {file.extension.toUpperCase()} · {formatDate(file.uploadedAt)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-zinc-400">
                          {file.extractedText.slice(0, 180)}
                          {file.extractedText.length > 180 ? "..." : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-neutral-600 dark:text-zinc-400">
                  Upload brand guideline files in the workspace to make every article draft, quality review, and rewrite obey the brand rules.
                </p>
              )}
            </DisclosureCard>

            <DisclosureCard
              id="seo"
              title="SEO Meta"
              description="Compact metadata block for CMS reuse."
              copyLabel="Copy meta"
              copyText={`Title: ${blog.meta.title}\nDescription: ${blog.meta.description}\nKeywords: ${blog.meta.keywords.join(", ")}`}
              accentClass="border-sky-500/15 bg-sky-500/7 dark:border-sky-500/15 dark:bg-white/5"
            >
              <div className="grid gap-2 text-sm text-neutral-600 dark:text-zinc-400">
                <p>
                  <strong className="text-neutral-900 dark:text-zinc-50">Title:</strong> {blog.meta.title}
                </p>
                <p>
                  <strong className="text-neutral-900 dark:text-zinc-50">Description:</strong> {blog.meta.description}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {blog.meta.keywords.map((keyword, index) => (
                  <span
                    className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-xs font-medium text-[#0f7b49] dark:bg-white/10 dark:text-[#86efac]"
                    key={`${keyword}-${index}`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </DisclosureCard>

            <DisclosureCard
              id="takeaways"
              title="Key Takeaways"
              description="Core points in compact form."
              copyLabel="Copy takeaways"
              copyText={blog.keyTakeaways.join("\n")}
              accentClass="border-emerald-500/15 bg-emerald-500/7 dark:border-emerald-500/15 dark:bg-white/5"
            >
              <div className="flex flex-wrap gap-2">
                {blog.keyTakeaways.map((takeaway) => (
                  <span className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-xs font-medium text-[#0f7b49] dark:bg-white/10 dark:text-[#86efac]" key={takeaway}>
                    {takeaway}
                  </span>
                ))}
              </div>
            </DisclosureCard>

            <DisclosureCard
              id="images"
              title="Image Prompts"
              description="Three consistent prompts for later image generation."
              copyLabel="Copy prompts"
              copyText={blog.imagePrompts.join("\n\n")}
              accentClass="border-violet-500/15 bg-violet-500/7 dark:border-violet-500/15 dark:bg-white/5"
            >
              <div className="grid gap-3">
                {blog.imagePrompts.map((prompt, index) => (
                  <div key={`${index}-${prompt}`} className="rounded-[12px] border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-white/5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400">Prompt {index + 1}</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-zinc-300">{prompt || "n/a"}</p>
                  </div>
                ))}
              </div>
            </DisclosureCard>

            <DisclosureCard
              id="links"
              title="Internal Link Suggestions"
              description="SEO-oriented anchors for strengthening site structure."
              copyLabel="Copy links"
              copyText={blog.internalLinks
                .map((link) => `${link.anchorText} -> ${link.targetUrl}\nPlacement: ${link.placement}\nWhy: ${link.rationale}`)
                .join("\n\n")}
              accentClass="border-amber-500/15 bg-amber-500/7 dark:border-amber-500/15 dark:bg-white/5"
            >
              <div className="grid gap-3">
                {blog.internalLinks.length === 0 ? (
                  <p className="text-sm text-neutral-600 dark:text-zinc-400">No link suggestions generated.</p>
                ) : (
                  blog.internalLinks.map((link) => (
                    <div key={`${link.anchorText}-${link.targetUrl}`} className="rounded-[12px] border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-white/5">
                      <p className="text-sm text-neutral-600 dark:text-zinc-400">
                        <strong className="text-neutral-900 dark:text-zinc-50">Anchor:</strong> {link.anchorText}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                        <strong className="text-neutral-900 dark:text-zinc-50">Target:</strong> {link.targetUrl}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                        <strong className="text-neutral-900 dark:text-zinc-50">Placement:</strong> {link.placement}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                        <strong className="text-neutral-900 dark:text-zinc-50">Why:</strong> {link.rationale}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </DisclosureCard>

            <DisclosureCard
              id="history"
              title="Approval History"
              description="Latest decisions and review notes."
              copyLabel="Copy approvals"
              copyText={approvals.map((approval) => `${approval.approved ? "Approved" : "Needs revision"} | ${approval.notes || "n/a"} | ${approval.score ?? "n/a"}`).join("\n")}
              accentClass="border-rose-500/15 bg-rose-500/7 dark:border-rose-500/15 dark:bg-white/5"
            >
              <div className="grid gap-3">
                {approvals.length === 0 ? <p className="text-sm text-neutral-600 dark:text-zinc-400">No approval decisions yet.</p> : null}
                {approvals.map((approval) => (
                  <div key={approval.approvalId} className="rounded-[12px] border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-white/5">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400">
                      <strong className="text-neutral-900 dark:text-zinc-50">Decision:</strong> {approval.approved ? "Approved" : "Needs revision"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                      <strong className="text-neutral-900 dark:text-zinc-50">Notes:</strong> {approval.notes || "n/a"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                      <strong className="text-neutral-900 dark:text-zinc-50">Quality score:</strong> {approval.score ?? "n/a"}
                    </p>
                  </div>
                ))}
              </div>
            </DisclosureCard>

            <DisclosureCard
              id="faqs"
              title="FAQs"
              description="Frequently asked questions included in the article."
              copyLabel="Copy FAQs"
              copyText={blog.faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n")}
              accentClass="border-indigo-500/15 bg-indigo-500/7 dark:border-indigo-500/15 dark:bg-white/5"
            >
              <div className="grid gap-3">
                {blog.faqs.map((faq) => (
                  <div key={faq.question} className="rounded-[12px] border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-white/5">
                    <strong className="block text-sm text-neutral-900 dark:text-zinc-50">{faq.question}</strong>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-zinc-400">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </DisclosureCard>
          </aside>
        </div>
      </section>
    </WorkspaceShell>
  );
}
