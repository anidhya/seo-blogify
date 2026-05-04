"use client";

import { useState, useTransition, type FormEvent } from "react";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import type { RunBundle } from "@/lib/storage";
import type { BlogQuality, GeneratedBlog, TopicSuggestion } from "@/lib/types";
import WorkflowProgressBar from "@/app/components/workflow-progress";
import Link from "next/link";

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

export default function TopicsClient({ runId, run }: Props) {
  const [topics, setTopics] = useState(run.topics?.topics ?? []);
  const [status, setStatus] = useState<string>(topics.length ? "Topics ready for approval." : "Generate a fresh queue.");
  const [error, setError] = useState<string | null>(null);
  const [manualTopic, setManualTopic] = useState("");
  const [manualTopicError, setManualTopicError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"suggest-topics" | "generate-blog" | null>(null);
  const [isPending, startTransition] = useTransition();
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });
  const approvedArticles = run.approvedArticles?.articles ?? [];

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
      } finally {
        setActiveAction(null);
      }
    });
  }

  function generateBlog(topic: TopicSuggestion) {
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
          setStatus("Blog draft generated.");
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setStatus("Blog generation failed.");
      } finally {
        setActiveAction(null);
      }
    });
  }

  function generateFromManualTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const topicValue = manualTopic.trim();

    if (!topicValue) {
      setManualTopicError("Enter a topic before generating an article.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setManualTopicError(null);
        setActiveAction("generate-blog");
        setStatus(`Generating an article from “${topicValue}”…`);

        const data = await postWorkflow("generate-blog", runId, {
          manualTopic: topicValue
        });

        if ("blog" in data) {
          setStatus(`Blog draft generated from “${topicValue}”.`);
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setStatus("Blog generation failed.");
      } finally {
        setActiveAction(null);
      }
    });
  }

  return (
    <section className="grid gap-3">
      {visibleProgress ? (
        <WorkflowProgressBar
          progress={visibleProgress}
          label={visibleProgress.action === "suggest-topics" ? "Topic generation" : "Blog generation"}
          variant="top"
        />
      ) : null}

      <form className="surface-shell grid gap-4 p-4" onSubmit={generateFromManualTopic}>
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Manual topic</p>
            <h2 className="mt-1 font-display text-2xl tracking-[-0.04em] text-zinc-900 dark:text-zinc-50">Generate an article from your own topic</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Type a topic, then run the same blog-generation pipeline used for approved suggestions.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center self-start whitespace-nowrap rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || Boolean(activeAction) || !manualTopic.trim()}
          >
            {activeAction === "generate-blog" ? "Generating…" : "Generate article"}
          </button>
        </div>
        <div className="grid gap-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Topic</span>
            <input
              value={manualTopic}
              onChange={(event) => {
                setManualTopic(event.target.value);
                if (manualTopicError) {
                  setManualTopicError(null);
                }
              }}
              placeholder="Example: content operations for lean marketing teams"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              disabled={isPending || Boolean(activeAction)}
              className="rounded-xl border border-black/[0.08] bg-white/5 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#0f7b49]/35 focus:bg-white/5 focus:ring-2 focus:ring-[#0f7b49]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-white/5"
            />
          </label>
          {manualTopicError ? <p className="text-sm text-red-600 dark:text-red-400">{manualTopicError}</p> : null}
        </div>
      </form>

      <div className="surface-shell p-4">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <h1 className="max-w-2xl font-display text-3xl tracking-[-0.04em] text-zinc-50 md:text-4xl">Topic Approval Queue</h1>
            <p className="mt-2 text-sm text-zinc-400 md:text-[15px]">
              Generate a fresh set of topics from the brand analysis and approve the best fit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-4 py-2 text-sm font-medium text-[#0f7b49] transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25"
              href={`/runs/${runId}/articles`}
            >
              Open approved articles
            </Link>
              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/20 disabled:cursor-progress disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                type="button"
                onClick={suggestTopics}
                disabled={isPending || Boolean(activeAction)}
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
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="surface-shell p-4 text-sm text-zinc-400">No topics have been generated for this run yet.</div>
      ) : (
        <div className="grid gap-3">
          {topics.map((topic) => (
            <article
              className="group rounded-[12px] border border-white/8 bg-white/5 p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-1 hover:border-[#0f7b49]/30 hover:bg-white/7 hover:shadow-[0_12px_24px_rgba(15,123,73,0.1)]"
              key={topic.title}
            >
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0f7b49] dark:text-[#86efac]">
                    Suggested topic
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-zinc-50">{topic.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{topic.rankingRationale}</p>
                </div>
                <button
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0f7b49]/20 bg-[#0f7b49]/10 text-[#0f7b49] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/20 disabled:cursor-progress disabled:opacity-60 dark:text-[#86efac]"
                  type="button"
                  disabled={isPending || Boolean(activeAction)}
                  onClick={() => generateBlog(topic)}
                  aria-label={`Approve ${topic.title}`}
                  title={`Approve ${topic.title}`}
                >
                  ✓
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-400">
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1">Keyword: {topic.primaryKeyword}</span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1">Intent: {topic.searchIntent}</span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1">SEO angle: {topic.seoAngle}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="surface-shell p-4">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">Approved Articles</h2>
            <p className="text-sm text-zinc-400">Each article keeps its own feedback loop and regeneration history.</p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-4 py-2 text-sm font-medium text-[#0f7b49] transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25"
            href={`/runs/${runId}/articles`}
          >
            Open articles
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-400">
          {approvedArticles.length > 0
            ? `${approvedArticles.length} approved article${approvedArticles.length === 1 ? "" : "s"} are available from the left nav.`
            : "No approved articles have been saved yet."}
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200" aria-live="polite">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-zinc-400">{status}</p>
    </section>
  );
}
