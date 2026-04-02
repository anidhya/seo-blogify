"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(
    run.approvedTopic?.approvedTopic ?? null
  );
  const [blog, setBlog] = useState(run.blog?.blog ?? null);
  const [wordCount, setWordCount] = useState(run.blog?.wordCount ?? null);
  const [quality, setQuality] = useState(run.quality?.quality ?? null);
  const [status, setStatus] = useState<string>(run.manifest?.status ?? "created");
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"suggest-topics" | "generate-blog" | null>(null);
  const [isPending, startTransition] = useTransition();

  const analysis = run.analysis?.analysis ?? null;
  const input = run.input ?? null;
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });
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

  const blogUrl = useMemo(() => {
    if (!blog?.slug) {
      return null;
    }

    return `/runs/${runId}/blog/${blog.slug}`;
  }, [blog?.slug, runId]);

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
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("generate-blog");
        setStatus(`Generating “${topic.title}”…`);
        setSelectedTopic(topic);

        const data = await postWorkflow("generate-blog", runId, {
          selectedTopic: topic
        });

        if ("blog" in data) {
          setBlog(data.blog);
          setWordCount(data.wordCount);
          setQuality(data.quality);
          setStatus("Blog draft generated.");
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setStatus("Blog generation failed.");
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
            <p className="mt-1 text-sm text-neutral-600">Blog: {blog ? "available" : "not generated yet"}</p>
          </div>
        </div>
      </div>

      {analysis ? (
        <section className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">Analysis so far</h2>
            <p className="text-sm text-neutral-600">Brand summary, audience, voice, and SEO notes from the sync.</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
              <h3 className="text-base font-semibold text-neutral-900">Audience</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{analysis.audience}</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
              <h3 className="text-base font-semibold text-neutral-900">Reading level</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{analysis.writingStyle.readingLevel}</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
              <h3 className="text-base font-semibold text-neutral-900">Company Summary</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{analysis.companySummary}</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
              <h3 className="text-base font-semibold text-neutral-900">Vision</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{analysis.vision}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
              <h3 className="text-base font-semibold text-neutral-900">Brand Voice</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.brandVoice.map((voice) => (
                  <span className="rounded-full bg-[#f2d1c3] px-3 py-1 text-xs font-medium text-[#7e3614]" key={voice}>
                    {voice}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
              <h3 className="text-base font-semibold text-neutral-900">SEO Observations</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.seoObservations.map((item) => (
                  <span className="rounded-full bg-[#f2d1c3] px-3 py-1 text-xs font-medium text-[#7e3614]" key={item}>
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
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25 disabled:cursor-progress disabled:opacity-60"
            type="button"
            onClick={suggestTopics}
            disabled={isPending || activeAction === "suggest-topics"}
          >
            {activeAction === "suggest-topics" ? "Suggesting…" : topics.length ? "Refresh topics" : "Suggest 10 Topics"}
          </button>
        </div>

        {visibleProgress && activeAction === "suggest-topics" ? (
          <WorkflowProgressBar progress={visibleProgress} label="Generating topics" className="mt-4" />
        ) : null}

        {topics.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-600">No topics have been generated for this run yet.</p>
        ) : (
          <div className="mt-5 grid gap-4">
            {topics.map((topic) => (
              <article className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4" key={topic.title}>
                <div className="flex items-start justify-between gap-4 max-md:flex-col">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-neutral-900">{topic.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">{topic.rankingRationale}</p>
                  </div>
                  <button
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-progress disabled:opacity-60"
                    type="button"
                    disabled={isPending || activeAction === "generate-blog"}
                    onClick={() => generateBlog(topic)}
                    aria-label={`Approve ${topic.title}`}
                    title={`Approve ${topic.title}`}
                  >
                    ✓
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm text-neutral-600">
                  <span>Keyword: {topic.primaryKeyword}</span>
                  <span>Intent: {topic.searchIntent}</span>
                  <span>SEO angle: {topic.seoAngle}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {blog ? (
        <section className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
          <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">Generated Blog</h2>
              <p className="text-sm text-neutral-600">Open the preview page to review, approve, or regenerate the article.</p>
            </div>
            {blogUrl ? (
              <a
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
                href={blogUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open preview
              </a>
            ) : null}
          </div>

          {visibleProgress && activeAction === "generate-blog" ? (
            <WorkflowProgressBar progress={visibleProgress} label="Generating blog" className="mt-4" />
          ) : null}

          <div className="mt-5 rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
            <h3 className="text-lg font-semibold text-neutral-900">{blog.title}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{blog.summary}</p>
            {wordCount ? <p className="mt-2 text-sm text-neutral-500">Word count: {wordCount}</p> : null}
            {quality ? (
              <p className="mt-1 text-sm text-neutral-500">
                Quality: {quality.score}% | {quality.publishStatus}
              </p>
            ) : null}
            {selectedTopic ? <p className="mt-1 text-sm text-neutral-500">Generated from: {selectedTopic.title}</p> : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" aria-live="polite">
          {error}
        </p>
      ) : null}
    </section>
  );
}
