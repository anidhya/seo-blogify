"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RunBundle } from "@/lib/storage";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import WorkflowProgressBar from "@/app/components/workflow-progress";
import CopyButton from "../copy-button";

function FailureIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M12 2 1 21h22L12 2Zm0 5.2 1 6.3h-2l1-6.3Zm0 10.3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"
      />
    </svg>
  );
}

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
  const [activeSlideNumber, setActiveSlideNumber] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<
    "prepare-linkedin" | "queue-linkedin-images" | "approve-linkedin" | "schedule-linkedin" | "publish-linkedin" | null
  >(draft ? null : "prepare-linkedin");
  const [isPending, startTransition] = useTransition();
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });

  useEffect(() => {
    if (!activeAction || !workflowProgress?.isComplete) {
      return;
    }

    const timer = setTimeout(() => {
      setActiveAction(null);
      setActiveSlideNumber(null);
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
                : activeAction === "queue-linkedin-images"
                    ? activeSlideNumber
                      ? `Generating slide ${activeSlideNumber}`
                      : "Queued for carousel generation"
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
  const workflowSummary = [
    { label: "Pack", value: draft ? draft.reviewStatus : "missing" },
    {
      label: "Images",
      value: draft?.failedSlides?.length
        ? `${draft.imageGenerationStatus ?? "idle"} · ${draft.failedSlides.length} failed`
        : draft?.imageGenerationStatus ?? "idle"
    },
    { label: "Approval", value: draft?.publishStatus ?? "draft" },
    { label: "Connection", value: connection?.connected ? "connected" : "offline" }
  ];

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

  function generateLinkedInImages(slideNumber?: number) {
    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("queue-linkedin-images");
        setActiveSlideNumber(typeof slideNumber === "number" ? slideNumber : null);
        await postWorkflow({
          step: "queue-linkedin-images",
          runId,
          articleSlug: slug,
          slideNumber
        });
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        router.refresh();
        setActiveAction(null);
        setActiveSlideNumber(null);
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
    <section className="grid gap-3">
      {visibleProgress ? (
        <WorkflowProgressBar
          progress={visibleProgress}
          label={visibleProgress.action === "publish-linkedin" ? "Publishing" : "LinkedIn workflow"}
          variant="top"
        />
      ) : null}

      <div className="surface-shell grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0f7b49] dark:text-[#86efac]">
              LinkedIn publishing
            </div>
            <h1 className="mt-3 max-w-3xl font-display text-3xl tracking-[-0.04em] text-zinc-50 md:text-4xl">
              {draft?.suggestedTitle ?? "LinkedIn draft"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 md:text-[15px]">
              Carousel prompts, approval, scheduling, and publishing for {run.input?.companyName || "this brand"}.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#0f7b49)] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 disabled:cursor-progress disabled:opacity-60"
            type="button"
            onClick={generateLinkedInPack}
            disabled={isPending || activeAction === "prepare-linkedin"}
          >
            {draft ? "Regenerate pack" : "Generate pack"}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {workflowSummary.map((item) => (
            <div key={item.label} className="rounded-[12px] border border-white/8 bg-white/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-zinc-50">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="pack" className="surface-shell scroll-mt-24 p-4">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">Pack</h2>
            <p className="mt-1 text-sm text-zinc-400">Suggested title, description, hashtags, and CTA for the LinkedIn post.</p>
          </div>
          <CopyButton
            label="Copy pack"
            text={`${draft?.suggestedTitle ?? ""}\n\n${draft?.suggestedDescription ?? ""}\n\n${draft?.hashtags?.map((tag) => `#${tag}`).join(" ") ?? ""}\n${draft?.callToAction ?? ""}`}
          />
        </div>
      </div>

      {!draft ? (
        <div className="surface-shell p-5">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">No LinkedIn pack yet</h2>
          <p className="mt-2 text-sm text-zinc-400">Generate the LinkedIn prompts from the approved article.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <section id="title" className="surface-shell scroll-mt-24 p-4">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">Suggested post title</h2>
                <p className="mt-1 text-sm text-zinc-400">Use this as the main LinkedIn post title or hook.</p>
              </div>
              <CopyButton label="Copy title" text={draft.suggestedTitle} />
            </div>
            <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-zinc-200">{draft.suggestedTitle}</p>
          </section>

          <section id="description" className="surface-shell scroll-mt-24 p-4">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">Suggested description</h2>
                <p className="mt-1 text-sm text-zinc-400">This is the LinkedIn-ready description or post body.</p>
              </div>
              <CopyButton label="Copy description" text={draft.suggestedDescription} />
            </div>
            <div className="mt-4 grid gap-3 rounded-[12px] border border-white/8 bg-white/5 p-4 dark:bg-white/5">
              <p className="whitespace-pre-line break-words text-sm leading-7 text-zinc-200">{draft.suggestedDescription}</p>
              <div className="flex flex-wrap gap-2">
                {draft.hashtags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#8b5cf6]/10 px-3 py-1 text-xs font-semibold text-violet-300">
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="text-sm text-zinc-300">
                <strong className="text-zinc-50">CTA:</strong> {draft.callToAction}
              </p>
            </div>
          </section>

          <section id="images" className="surface-shell scroll-mt-24 p-4">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">Carousel prompts</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Four slide prompts with a consistent visual system. Queue each slide from its own icon button.
                </p>
              </div>
              <CopyButton label="Copy prompts" text={promptCopy} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {draft.carouselPrompts.map((slide) => {
                const generatedImage = draft.generatedImages.find((image) => image.slideNumber === slide.slideNumber) ?? null;
                const failedSlide = draft.failedSlides.find((failure) => failure.slideNumber === slide.slideNumber) ?? null;
                const isSlideLoading = activeAction === "queue-linkedin-images" && activeSlideNumber === slide.slideNumber;
                return (
                  <article
                    key={slide.slideNumber}
                    className="group flex h-full flex-col rounded-[14px] border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f7b49]/20 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/7"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-white/8 dark:bg-white/5 dark:text-zinc-400">
                            Slide {slide.slideNumber}
                          </div>
                          <div
                            className={[
                              "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                              failedSlide && !generatedImage
                                ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
                                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/8 dark:bg-white/5 dark:text-zinc-400"
                            ].join(" ")}
                          >
                            {failedSlide && !generatedImage ? "failed" : generatedImage ? generatedImage.renderMode : "idle"}
                          </div>
                        </div>
                        <h3 className="text-[14px] font-semibold leading-5 text-slate-900 dark:text-zinc-50">{slide.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {failedSlide && !generatedImage ? (
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/25 disabled:cursor-progress disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/15"
                            type="button"
                            onClick={() => generateLinkedInImages(slide.slideNumber)}
                            disabled={isPending || activeAction === "queue-linkedin-images"}
                            aria-label={`Retry slide ${slide.slideNumber} image generation`}
                            title={`Retry slide ${slide.slideNumber} image generation`}
                          >
                            <span aria-hidden className={`text-base leading-none ${isSlideLoading ? "animate-spin" : ""}`}>
                              ↻
                            </span>
                          </button>
                        ) : (
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-[#0f7b49]/20 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 disabled:cursor-progress disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
                            type="button"
                            onClick={() => generateLinkedInImages(slide.slideNumber)}
                            disabled={isPending || activeAction === "queue-linkedin-images"}
                            aria-label={`Queue slide ${slide.slideNumber} image generation`}
                            title={`Queue slide ${slide.slideNumber} image generation`}
                          >
                            <span aria-hidden className={`text-base leading-none ${isSlideLoading ? "animate-spin" : ""}`}>
                              ↻
                            </span>
                          </button>
                        )}
                        <CopyButton label="Copy slide" text={`${slide.title}\n${slide.prompt}\nDesign notes: ${slide.designNotes}`} />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <p className="line-clamp-3 break-words text-sm leading-6 text-slate-700 dark:text-zinc-300">{slide.prompt}</p>
                      {failedSlide && !generatedImage ? (
                        <div
                          className="flex w-full items-center gap-2 overflow-hidden rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/15 dark:bg-red-500/5 dark:text-red-100"
                          title={failedSlide.reason}
                        >
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-200">
                            <FailureIcon />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-500 dark:text-red-200">
                              Image generation failed
                            </p>
                            <p className="truncate text-xs leading-5 text-red-600 dark:text-red-100">
                              Tap retry to generate this slide again.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <details className="mt-4 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/8 dark:bg-white/5" open={draft.generatedImages.length > 0}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold tracking-[-0.03em] text-slate-900 dark:text-zinc-50">Generated images</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    {draft.generatedImages.length
                      ? "Google AI Studio images generated from the carousel prompts."
                      : "Use the slide icon buttons to generate each image."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-xs font-semibold text-[#0f7b49] dark:bg-[#8b5cf6]/10 dark:text-violet-300">
                    {draft.generatedImages.length} slides
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                    {draft.imageGenerationStatus}
                  </span>
                </div>
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {draft.generatedImages.length ? (
                  draft.generatedImages.map((image) => (
                    <article
                      key={`${image.slideNumber}-${image.generatedAt}`}
                      className="overflow-hidden rounded-[12px] border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-[#0f7b49]/20 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/7"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-white/8">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">
                            Slide {image.slideNumber}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-zinc-400">
                            {image.model} · {image.renderMode === "google-image" ? "Google image" : "Preview asset"}
                          </p>
                        </div>
                        <CopyButton label="Copy image prompt" text={image.prompt} />
                      </div>
                      <div className="bg-neutral-950">
                        <Image
                          alt={`LinkedIn carousel slide ${image.slideNumber}`}
                          src={image.imageDataUrl}
                          width={1000}
                          height={1250}
                          unoptimized
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-white/8 dark:bg-white/5 dark:text-zinc-400">
                    No generated images yet. Use the slide icon buttons to queue them one at a time.
                  </div>
                )}
              </div>
            </details>
          </section>

          <section id="controls" className="surface-shell scroll-mt-24 p-4">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">Publish controls</h2>
                <p className="mt-1 text-sm text-zinc-400">Approve the LinkedIn content, then schedule or publish.</p>
              </div>
              <a
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
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
                  className="min-h-24 w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20"
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
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25 disabled:cursor-progress disabled:opacity-60"
                  type="button"
                  onClick={() => submitApproval(false)}
                  disabled={isPending || activeAction === "approve-linkedin"}
                >
                  Needs revision
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/8 dark:bg-white/5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">Connection</p>
              <p className="text-sm text-slate-700 dark:text-zinc-300">
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
                <p className="text-sm text-emerald-300">OAuth connection is active.</p>
              )}
            </div>

            <div className="mt-5 grid gap-3 rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/8 dark:bg-white/5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">Schedule</p>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/8 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/25 disabled:cursor-progress disabled:opacity-60"
                  type="button"
                  onClick={publishLinkedIn}
                  disabled={isPending || activeAction === "publish-linkedin" || !canPublishNow}
                >
                  {activeAction === "publish-linkedin" ? "Publishing…" : "Publish now"}
                </button>
              </div>
              {!canSchedule ? <p className="text-sm text-slate-500 dark:text-zinc-400">Approve the LinkedIn content before scheduling it.</p> : null}
              {!canPublishNow ? <p className="text-sm text-slate-500 dark:text-zinc-400">Connect LinkedIn to publish immediately.</p> : null}
            </div>
          </section>

          <section id="review" className="surface-shell scroll-mt-24 p-4">
            <div className="flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">Approval history</h2>
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
                  <div key={approval.approvalId} className="rounded-[12px] border border-slate-200 bg-white p-3 shadow-sm dark:border-white/8 dark:bg-white/5">
                    <p className="text-sm text-slate-700 dark:text-zinc-300">
                      <strong className="text-slate-900 dark:text-zinc-50">Decision:</strong>{" "}
                      {approval.approved ? "Approved" : "Needs revision"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                      <strong className="text-zinc-50">Notes:</strong> {approval.notes || "n/a"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No LinkedIn approval history yet.</p>
              )}
            </div>
            {publication ? (
              <div className="mt-4 rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-200">Publication status: {publication.status}</p>
                <p className="mt-1 text-sm text-emerald-200">Published at: {publication.publishedAt ?? "n/a"}</p>
              </div>
            ) : null}
            {schedule ? (
              <div className="mt-4 rounded-[12px] border border-indigo-500/20 bg-indigo-500/10 p-4">
                <p className="text-sm font-semibold text-indigo-200">Scheduled for {schedule.scheduledFor}</p>
                <p className="mt-1 text-sm text-indigo-200">{schedule.notes || "No scheduling notes."}</p>
              </div>
            ) : null}
          </section>
        </div>
      )}

      {error ? (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200" aria-live="polite">
          {error}
        </p>
      ) : null}
    </section>
  );
}
