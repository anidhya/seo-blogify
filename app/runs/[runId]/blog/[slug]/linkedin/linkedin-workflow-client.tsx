"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RunBundle } from "@/lib/storage";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import WorkflowProgressBar from "@/app/components/workflow-progress";
import CopyButton from "../copy-button";

type Props = {
  runId: string;
  slug: string;
  run: RunBundle;
};

type WorkflowResponse =
  | { runId: string; draft?: unknown; schedule?: unknown; approved?: boolean; published?: unknown }
  | { error: string };

async function postWorkflow(payload: Record<string, unknown>) {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as WorkflowResponse;

  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Workflow request failed.");
  }

  return data;
}

function toLocalDatetimeInput(value?: string | null) {
  if (!value) {
    const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tzOffset = nextDay.getTimezoneOffset() * 60000;
    return new Date(nextDay.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function LinkedInWorkflowClient({ runId, slug, run }: Props) {
  const router = useRouter();
  const linkedIn = run.linkedin?.articles.find((article) => article.articleSlug === slug) ?? null;
  const draft = linkedIn?.draft ?? null;
  const connection = linkedIn?.connection ?? null;
  const schedule = linkedIn?.schedule ?? null;
  const publication = linkedIn?.publication ?? null;
  const [approvalNotes, setApprovalNotes] = useState("");
  const [scheduleFor, setScheduleFor] = useState(toLocalDatetimeInput(schedule?.scheduledFor ?? null));
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<
    "prepare-linkedin" | "approve-linkedin" | "schedule-linkedin" | "publish-linkedin" | null
  >(draft ? null : "prepare-linkedin");
  const [isPending, startTransition] = useTransition();
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });

  useEffect(() => {
    if (!activeAction || !workflowProgress?.isComplete) {
      return;
    }

    const timer = setTimeout(() => {
      setActiveAction(null);
    }, 900);

    return () => clearTimeout(timer);
  }, [activeAction, workflowProgress?.isComplete]);

  const visibleProgress =
    activeAction && workflowProgress
      ? workflowProgress
      : activeAction
        ? {
            action: activeAction,
            percent: 8,
            stageLabel:
              activeAction === "prepare-linkedin"
                ? "Preparing LinkedIn pack"
                : activeAction === "approve-linkedin"
                  ? "Recording approval"
                  : activeAction === "schedule-linkedin"
                    ? "Saving schedule"
                    : "Publishing to LinkedIn",
            updatedAt: new Date().toISOString(),
            isComplete: false
          }
        : null;

  const canSchedule = Boolean(draft && draft.reviewStatus === "approved");
  const canPublishNow = Boolean(connection?.connected && connection.accessToken && connection.memberUrn && canSchedule);

  const promptCopy = useMemo(() => {
    if (!draft) {
      return "";
    }

    return draft.carouselPrompts
      .map((slide) => `Slide ${slide.slideNumber}: ${slide.title}\n${slide.prompt}\nDesign notes: ${slide.designNotes}`)
      .join("\n\n");
  }, [draft]);

  function generateLinkedInPack() {
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("prepare-linkedin");
        await postWorkflow({
          step: "prepare-linkedin",
          runId,
          articleSlug: slug
        });
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        setActiveAction(null);
      }
    });
  }

  function submitApproval(approved: boolean) {
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("approve-linkedin");
        await postWorkflow({
          step: "approve-linkedin",
          runId,
          articleSlug: slug,
          approved,
          comments: approvalNotes.trim()
        });
        setApprovalNotes("");
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        setActiveAction(null);
      }
    });
  }

  function scheduleLinkedIn() {
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("schedule-linkedin");
        await postWorkflow({
          step: "schedule-linkedin",
          runId,
          articleSlug: slug,
          payload: {
            scheduledFor: new Date(scheduleFor).toISOString()
          },
          comments: "LinkedIn schedule"
        });
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        setActiveAction(null);
      }
    });
  }

  function publishLinkedIn() {
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("publish-linkedin");
        await postWorkflow({
          step: "publish-linkedin",
          runId,
          articleSlug: slug
        });
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        setActiveAction(null);
      }
    });
  }

  return (
    <section className="grid gap-6">
      {visibleProgress ? (
        <WorkflowProgressBar
          progress={visibleProgress}
          label={visibleProgress.action === "publish-linkedin" ? "Publishing" : "LinkedIn workflow"}
          variant="top"
        />
      ) : null}

      <div className="rounded-[2rem] border border-black/10 bg-gradient-to-br from-[#f5f8ff] via-[#fffaf7] to-[#fff4eb] p-6 shadow-[0_24px_80px_rgba(90,71,51,0.14)]">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6d28d9]">
              LinkedIn publishing
            </div>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-neutral-950 md:text-6xl">
              {draft?.headline ?? "LinkedIn draft"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600 md:text-base">
              Carousel-ready prompts, approval flow, schedule controls, and publish state for {run.input?.companyName || "this brand"}.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Status</p>
            <p className="text-sm text-neutral-700">
              Draft: <span className="font-semibold text-neutral-950">{draft?.reviewStatus ?? "missing"}</span>
            </p>
            <p className="text-sm text-neutral-700">
              Publish: <span className="font-semibold text-neutral-950">{draft?.publishStatus ?? "missing"}</span>
            </p>
            <p className="text-sm text-neutral-700">
              Connection: <span className="font-semibold text-neutral-950">{connection?.connected ? "Connected" : "Not connected"}</span>
            </p>
          </div>
        </div>
      </div>

      {!draft ? (
        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)]">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">No LinkedIn pack yet</h2>
          <p className="mt-2 text-sm text-neutral-600">Generate the LinkedIn prompts from the approved article.</p>
          <button
            className="mt-4 inline-flex items-center justify-center rounded-full bg-[#c35d2e] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b65228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/30 disabled:cursor-progress disabled:opacity-60"
            type="button"
            onClick={generateLinkedInPack}
            disabled={isPending || activeAction === "prepare-linkedin"}
          >
            {activeAction === "prepare-linkedin" ? "Preparing…" : "Generate LinkedIn pack"}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6">
            <section className="rounded-[2rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)]">
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">Carousel prompts</h2>
                  <p className="mt-1 text-sm text-neutral-600">Four slide prompts with a consistent visual system.</p>
                </div>
                <CopyButton label="Copy prompts" text={promptCopy} />
              </div>
              <div className="mt-4 grid gap-4">
                {draft.carouselPrompts.map((slide) => (
                  <article
                    key={slide.slideNumber}
                    className="group rounded-[1.5rem] border border-black/10 bg-gradient-to-br from-[#fffaf4] to-[#eef4ff] p-4 transition hover:-translate-y-1 hover:border-[#8b5cf6]/25 hover:shadow-[0_22px_50px_rgba(139,92,246,0.12)]"
                  >
                    <div className="flex items-start justify-between gap-4 max-md:flex-col">
                      <div>
                        <div className="inline-flex rounded-full border border-black/5 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          Slide {slide.slideNumber}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-neutral-950">{slide.title}</h3>
                      </div>
                      <CopyButton label="Copy slide" text={`${slide.title}\n${slide.prompt}\n${slide.designNotes}`} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-700">{slide.prompt}</p>
                    <p className="mt-3 rounded-2xl border border-white/70 bg-white/70 p-3 text-sm text-neutral-600">
                      <strong className="text-neutral-900">Design notes:</strong> {slide.designNotes}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)]">
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">Caption and hashtags</h2>
                  <p className="mt-1 text-sm text-neutral-600">Post copy ready for LinkedIn.</p>
                </div>
                <CopyButton label="Copy caption" text={`${draft.headline}\n\n${draft.caption}\n\n${draft.hashtags.map((tag) => `#${tag}`).join(" ")}`} />
              </div>
              <div className="mt-4 grid gap-3 rounded-[1.5rem] border border-black/10 bg-[#fffaf7] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Headline</p>
                <p className="text-lg font-semibold text-neutral-950">{draft.headline}</p>
                <p className="text-sm leading-7 text-neutral-700 whitespace-pre-line">{draft.caption}</p>
                <div className="flex flex-wrap gap-2">
                  {draft.hashtags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-semibold text-[#6d28d9]">
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-neutral-700">
                  <strong className="text-neutral-950">CTA:</strong> {draft.callToAction}
                </p>
              </div>
            </section>
          </div>

          <aside className="grid gap-6">
            <section className="rounded-[2rem] border border-black/10 bg-gradient-to-br from-white via-[#fffaf2] to-[#eef7ff] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)]">
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">Publish controls</h2>
                  <p className="mt-1 text-sm text-neutral-600">Approve the LinkedIn content, then schedule or publish.</p>
                </div>
                <a
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
                  href={`/runs/${runId}/blog/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open article
                </a>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-neutral-800" htmlFor="linkedin-notes">
                    Approval notes
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20"
                    id="linkedin-notes"
                    name="linkedinNotes"
                    autoComplete="off"
                    value={approvalNotes}
                    onChange={(event) => setApprovalNotes(event.target.value)}
                    placeholder="Add review notes for the LinkedIn pack…"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#7c3aed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/30 disabled:cursor-progress disabled:opacity-60"
                    type="button"
                    onClick={() => submitApproval(true)}
                    disabled={isPending || activeAction === "approve-linkedin"}
                  >
                    {activeAction === "approve-linkedin" ? "Saving…" : "Approve"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25 disabled:cursor-progress disabled:opacity-60"
                    type="button"
                    onClick={() => submitApproval(false)}
                    disabled={isPending || activeAction === "approve-linkedin"}
                  >
                    Needs revision
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-black/10 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Connection</p>
                <p className="text-sm text-neutral-700">
                  {connection?.connected
                    ? `Connected${connection.memberName ? ` as ${connection.memberName}` : ""}`
                    : "Not connected yet"}
                </p>
                {!connection?.connected ? (
                  <a
                    className="inline-flex items-center justify-center rounded-full border border-[#0a66c2]/20 bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#0857a7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a66c2]/30"
                    href={`/api/linkedin/connect?runId=${encodeURIComponent(runId)}&articleSlug=${encodeURIComponent(slug)}`}
                  >
                    Connect LinkedIn
                  </a>
                ) : (
                  <p className="text-sm text-emerald-700">OAuth connection is active.</p>
                )}
              </div>

              <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-black/10 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Schedule</p>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  type="datetime-local"
                  value={scheduleFor}
                  onChange={(event) => setScheduleFor(event.target.value)}
                  disabled={!canSchedule}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-[#16a34a] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#15803d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/30 disabled:cursor-progress disabled:opacity-60"
                    type="button"
                    onClick={scheduleLinkedIn}
                    disabled={isPending || activeAction === "schedule-linkedin" || !canSchedule}
                  >
                    {activeAction === "schedule-linkedin" ? "Scheduling…" : "Schedule"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/25 disabled:cursor-progress disabled:opacity-60"
                    type="button"
                    onClick={publishLinkedIn}
                    disabled={isPending || activeAction === "publish-linkedin" || !canPublishNow}
                  >
                    {activeAction === "publish-linkedin" ? "Publishing…" : "Publish now"}
                  </button>
                </div>
                {!canSchedule ? (
                  <p className="text-sm text-neutral-600">Approve the LinkedIn content before scheduling it.</p>
                ) : null}
                {!canPublishNow ? (
                  <p className="text-sm text-neutral-600">Connect LinkedIn to publish immediately.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)]">
              <div className="flex items-start justify-between gap-4 max-md:flex-col">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">Approval history</h2>
                </div>
                <CopyButton
                  label="Copy history"
                  text={(linkedIn?.approvals ?? [])
                    .map((approval) => `${approval.approved ? "Approved" : "Needs revision"} | ${approval.notes || "n/a"}`)
                    .join("\n")}
                />
              </div>
              <div className="mt-4 grid gap-3">
                {linkedIn?.approvals?.length ? (
                  linkedIn.approvals.map((approval) => (
                    <div key={approval.approvalId} className="rounded-2xl border border-black/10 bg-white/80 p-3">
                      <p className="text-sm text-neutral-700">
                        <strong className="text-neutral-950">Decision:</strong> {approval.approved ? "Approved" : "Needs revision"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-700">
                        <strong className="text-neutral-950">Notes:</strong> {approval.notes || "n/a"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-600">No LinkedIn approval history yet.</p>
                )}
              </div>
              {publication ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-800">Publication status: {publication.status}</p>
                  <p className="mt-1 text-sm text-emerald-800">Published at: {publication.publishedAt ?? "n/a"}</p>
                </div>
              ) : null}
              {schedule ? (
                <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-sm font-semibold text-indigo-800">Scheduled for {schedule.scheduledFor}</p>
                  <p className="mt-1 text-sm text-indigo-800">{schedule.notes || "No scheduling notes."}</p>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      )}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" aria-live="polite">
          {error}
        </p>
      ) : null}
    </section>
  );
}
