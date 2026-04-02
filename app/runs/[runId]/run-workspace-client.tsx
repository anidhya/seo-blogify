"use client";

import { useEffect, useState, useTransition } from "react";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import type { RunBundle } from "@/lib/storage";
import type { BlogQuality, GeneratedBlog, TopicSuggestion } from "@/lib/types";
import WorkflowProgressBar from "@/app/components/workflow-progress";

type WorkflowResponse =
  | { runId: string; topics: TopicSuggestion[] }
  | {
      runId: string;
      blog: GeneratedBlog;
      wordCount: number;
      quality: BlogQuality;
    }
  | { error: string };

type Props = {
  runId: string;
  run: RunBundle;
};

async function postWorkflow(step: string, runId: string, payload?: Record<string, unknown>) {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ step, runId, payload })
  });

  const data = (await response.json()) as WorkflowResponse;

  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Workflow request failed.");
  }

  return data;
}

export default function RunWorkspaceClient({ runId, run }: Props) {
  const [topics, setTopics] = useState(run.topics?.topics ?? []);
  const [approvedArticles, setApprovedArticles] = useState(run.approvedArticles?.articles ?? []);
  const [status, setStatus] = useState<string>(run.manifest?.status ?? "created");
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"suggest-topics" | "generate-blog" | null>(null);
  const [isPending, startTransition] = useTransition();

  const analysis = run.analysis?.analysis ?? null;
  const input = run.input ?? null;
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });
  const blogSources = run.research?.blogs ?? [];
  const sitemapUrls = run.research?.sitemapUrls ?? [];
  const visibleProgress =
    activeAction && workflowProgress
      ? workflowProgress
      : activeAction
        ? {
            action: activeAction,
            percent: 8,
            stageLabel: activeAction === "suggest-topics" ? "Starting topic discovery" : "Starting blog generation",
            updatedAt: new Date().toISOString(),
            isComplete: false
          }
        : null;

  useEffect(() => {
    if (!activeAction || !workflowProgress?.isComplete) {
      return;
    }

    const timer = setTimeout(() => {
      setActiveAction(null);
    }, 900);

    return () => clearTimeout(timer);
  }, [activeAction, workflowProgress?.isComplete]);

  function suggestTopics() {
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("suggest-topics");
        setStatus("Building 10 fresh topic ideas…");
        const data = await postWorkflow("suggest-topics", runId);

        if ("topics" in data) {
          setTopics(data.topics);
          setStatus("Topics are ready for approval.");
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setStatus("Topic generation failed.");
      }
    });
  }

  function generateBlog(topic: TopicSuggestion) {
    const previousTopics = topics;
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("generate-blog");
        setStatus(`Generating “${topic.title}”…`);

        const data = await postWorkflow("generate-blog", runId, {
          selectedTopic: topic
        });

        if ("blog" in data) {
          setTopics((current) =>
            current.filter(
              (item) =>
                item.title !== topic.title &&
                item.primaryKeyword !== topic.primaryKeyword &&
                item.searchIntent !== topic.searchIntent
            )
          );
          setApprovedArticles((current) => {
            const nextArticle = {
              articleId: data.blog.slug,
              articleSlug: data.blog.slug,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              topic,
              blog: data.blog,
              quality: data.quality,
              wordCount: data.wordCount,
              approvalStatus: data.quality.publishStatus === "publish_ready" ? "pending" : "needs_revision",
              feedbackCount: 0
            } as const;

            return [...current.filter((article) => article.articleSlug !== data.blog.slug), nextArticle];
          });
          setStatus("Blog draft generated.");
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setStatus("Blog generation failed.");
        setTopics(previousTopics);
      }
    });
  }

  return (
    <section className="grid gap-6">
      <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm text-neutral-600 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c35d2e]" />
              Run workspace
            </div>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-neutral-900 md:text-6xl">
              {input?.companyName || "Untitled brand"}
            </h1>
            <p className="mt-2 text-sm text-neutral-600 md:text-base">
              {input?.websiteUrl || "No website URL"} · {status}
            </p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4 shadow-[0_16px_40px_rgba(98,69,39,0.12)]">
            <strong className="block text-sm text-neutral-900">Run ID</strong>
            <p className="mt-1 text-sm text-neutral-600">{runId}</p>
            <p className="mt-1 text-sm text-neutral-600">Manifest: {run.manifest?.status ?? "created"}</p>
            <p className="mt-1 text-sm text-neutral-600">Approved articles: {approvedArticles.length}</p>
          </div>
        </div>
      </div>

      {visibleProgress ? (
        <WorkflowProgressBar
          progress={visibleProgress}
          label={visibleProgress.action === "suggest-topics" ? "Topic generation" : "Blog generation"}
          variant="top"
        />
      ) : null}

      {analysis ? (
        <section className="rounded-[2rem] border border-black/10 bg-gradient-to-br from-[#fff4ea] via-[#fffaf4] to-[#eef7ff] p-6 shadow-[0_24px_80px_rgba(70,96,132,0.14)] backdrop-blur">
          <div className="flex items-start justify-between gap-4 max-md:flex-col">
            <div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm text-neutral-700 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                Brand Analysis
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">Analysis so far</h2>
              <p className="text-sm text-neutral-600">Brand summary, audience, voice, SEO notes, & source coverage from the sync.</p>
            </div>
            <div className="grid gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Site Sources</p>
              <div className="grid gap-2 text-sm text-neutral-700">
                <p>
                  Website: <span className="font-medium text-neutral-950">{input?.websiteUrl ?? "n/a"}</span>
                </p>
                <p>
                  Blog URLs: <span className="font-medium text-neutral-950">{blogSources.length}</span>
                </p>
                <p>
                  Sitemap URLs: <span className="font-medium text-neutral-950">{sitemapUrls.length}</span>
                </p>
              </div>
              <div className="max-h-32 overflow-auto rounded-2xl border border-black/5 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Blog URL list
                </p>
                <div className="mt-2 grid gap-2 text-xs text-neutral-600">
                  {blogSources.length === 0 ? (
                    <p>No blog URLs discovered.</p>
                  ) : (
                    blogSources.map((page) => (
                      <div key={page.url} className="rounded-xl border border-black/5 bg-neutral-50 px-3 py-2">
                        <p className="font-medium text-neutral-900">{page.title}</p>
                        <p className="break-all text-neutral-600">{page.url}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {run.research?.resolvedSitemapUrl ? (
                <p className="text-xs text-neutral-500">
                  Resolved sitemap: <span className="break-all text-neutral-800">{run.research.resolvedSitemapUrl}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Audience</span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Voice</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">SEO</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Coverage</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-sky-200/70 bg-sky-50/90 p-4 shadow-[0_14px_40px_rgba(56,189,248,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Audience</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.audience}</p>
            </div>
            <div className="rounded-[1.5rem] border border-violet-200/70 bg-violet-50/90 p-4 shadow-[0_14px_40px_rgba(139,92,246,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Reading Level</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.writingStyle.readingLevel}</p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200/70 bg-amber-50/90 p-4 shadow-[0_14px_40px_rgba(245,158,11,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Company Summary</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.companySummary}</p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/90 p-4 shadow-[0_14px_40px_rgba(16,185,129,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Vision</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.vision}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-neutral-200/70 bg-white/80 p-4 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">Brand Voice</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.brandVoice.map((voice) => (
                  <span className="rounded-full bg-[#f2d1c3] px-3 py-1 text-xs font-medium text-[#7e3614]" key={voice}>
                    {voice}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-neutral-200/70 bg-white/80 p-4 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">SEO Observations</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.seoObservations.map((item) => (
                  <span className="rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-medium text-[#1d4ed8]" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
        <div className="flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">Topic Approval Queue</h2>
            <p className="text-sm text-neutral-600">Approve a topic to generate the draft. Generate a fresh queue if needed.</p>
          </div>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25 disabled:cursor-progress disabled:opacity-60"
            type="button"
            onClick={suggestTopics}
            disabled={isPending || activeAction === "suggest-topics"}
            aria-label={topics.length ? "Refresh topics" : "Suggest 10 topics"}
            title={topics.length ? "Refresh topics" : "Suggest 10 topics"}
          >
            {activeAction === "suggest-topics" ? (
              <svg aria-hidden="true" className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 12a8 8 0 0 1 13.657-5.657L20 8.686"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path
                  d="M20 12a8 8 0 0 1-13.657 5.657L4 15.314"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M4 20v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {topics.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-600">No topics have been generated for this run yet.</p>
        ) : (
          <div className="mt-5 grid gap-4">
            {topics.map((topic) => (
              <article
                className="group rounded-[1.75rem] border border-black/10 bg-gradient-to-br from-white via-[#fffaf2] to-[#fff4ea] p-4 shadow-[0_18px_48px_rgba(195,93,46,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#c35d2e]/30 hover:shadow-[0_24px_60px_rgba(195,93,46,0.16)]"
                key={topic.title}
              >
                <div className="flex items-start justify-between gap-4 max-md:flex-col">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#c35d2e]/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a4520]">
                      Suggested topic
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-neutral-950">{topic.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">{topic.rankingRationale}</p>
                  </div>
                  <button
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-progress disabled:opacity-60"
                    type="button"
                    disabled={isPending || activeAction === "generate-blog"}
                    onClick={() => generateBlog(topic)}
                    aria-label={`Approve ${topic.title}`}
                    title={`Approve ${topic.title}`}
                  >
                    ✓
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-neutral-600">
                  <span className="rounded-full border border-black/5 bg-white/80 px-3 py-1">Keyword: {topic.primaryKeyword}</span>
                  <span className="rounded-full border border-black/5 bg-white/80 px-3 py-1">Intent: {topic.searchIntent}</span>
                  <span className="rounded-full border border-black/5 bg-white/80 px-3 py-1">SEO angle: {topic.seoAngle}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
        <div className="flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">Approved Articles</h2>
            <p className="text-sm text-neutral-600">Each article keeps its own feedback loop and regeneration history.</p>
          </div>
        </div>

        {approvedArticles.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-600">No approved articles have been saved yet.</p>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {approvedArticles.map((article) => (
              <article key={article.articleSlug} className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
                <div className="flex items-start justify-between gap-4 max-md:flex-col">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-neutral-900">{article.blog.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">{article.blog.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
                      href={`/runs/${runId}/blog/${article.articleSlug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                    <a
                      className="inline-flex items-center justify-center rounded-full border border-[#8b5cf6]/20 bg-[#f5f3ff] px-4 py-2 text-sm font-medium text-[#6d28d9] transition hover:-translate-y-0.5 hover:bg-[#ede9fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25"
                      href={`/runs/${runId}/blog/${article.articleSlug}/linkedin`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn
                    </a>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-neutral-600">
                  <span>Topic: {article.topic.title}</span>
                  <span>Quality: {article.quality.score}%</span>
                  <span>Status: {article.approvalStatus}</span>
                  <span>Feedback: {article.feedbackCount}</span>
                  <span>
                    LinkedIn:{" "}
                    {run.linkedin?.articles.find((item) => item.articleSlug === article.articleSlug)?.draft?.reviewStatus ??
                      "pending"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" aria-live="polite">
          {error}
        </p>
      ) : null}
    </section>
  );
}
