"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  SocialComment,
  SocialPlatform,
  SocialPlatformRecord,
  SocialProject,
  SocialVariant
} from "@/lib/types";
import { getActiveVariant } from "@/lib/social-workflow";

type ActionBody = Record<string, unknown>;

type Props = {
  initialProject: SocialProject;
};

function formatIso(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function draftFromVariant(variant: SocialVariant) {
  return {
    variantId: variant.variantId,
    format: variant.format,
    title: variant.title,
    body: variant.body,
    segments: variant.segments.join("\n"),
    hashtags: variant.hashtags.join(", "),
    callToAction: variant.callToAction,
    label: variant.label,
    designNotes: variant.designNotes.join("\n")
  };
}

type EditorDraft = ReturnType<typeof draftFromVariant>;

function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  const label = platform === "instagram" ? "Instagram" : platform === "linkedin" ? "LinkedIn" : "X";
  const cls =
    platform === "instagram"
      ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
      : platform === "linkedin"
        ? "bg-[#0a66c2]/10 text-[#0a66c2] dark:text-[#8ab4ff]"
        : "bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-300";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${cls}`}>{label}</span>;
}

function platformName(platform: SocialPlatform) {
  return platform === "instagram" ? "Instagram" : platform === "linkedin" ? "LinkedIn" : "X";
}

function platformAccent(platform: SocialPlatform) {
  if (platform === "instagram") {
    return "border-orange-500/15 bg-orange-500/[0.08]";
  }
  if (platform === "linkedin") {
    return "border-[#0a66c2]/15 bg-[#0a66c2]/[0.08]";
  }
  return "border-zinc-200 bg-zinc-50";
}

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
        connected
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
      }`}
    >
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

async function patchProject(projectId: string, body: ActionBody) {
  const response = await fetch(`/api/social/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = (await response.json()) as { project?: SocialProject; error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error || "Unable to update social project.");
  }
  return data.project ?? null;
}

type PreviewSlide = {
  slideNumber: number;
  label: string;
  title: string;
  body: string;
  footer: string;
};

function buildPreviewSlides(
  draft: EditorDraft
) {
  const segments = draft.segments
    .split("\n")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const hashtags = draft.hashtags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const slides: PreviewSlide[] = [];

  slides.push({
    slideNumber: 1,
    label: draft.format === "single" ? "Single" : "Cover",
    title: draft.title,
    body: draft.body,
    footer: draft.callToAction
  });

  if (draft.format !== "single") {
    segments.forEach((segment, index) => {
      slides.push({
        slideNumber: slides.length + 1,
        label: `Slide ${index + 2}`,
        title: segment.split(":")[0] || draft.title,
        body: segment,
        footer: index === segments.length - 1 ? draft.callToAction : draft.designNotes[0] || "Keep the story moving."
      });
    });

    slides.push({
      slideNumber: slides.length + 1,
      label: "Close",
      title: draft.callToAction,
      body: hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" "),
      footer: draft.designNotes[0] || "Finish with a clear action."
    });
  }

  return slides;
}

function CommentList({
  comments,
  onResolve
}: {
  comments: SocialComment[];
  onResolve: (commentId: string) => void;
}) {
  if (comments.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No comments yet.</p>;
  }

  return (
    <div className="grid gap-2">
      {comments.map((comment) => (
        <div
          key={comment.commentId}
          className={`rounded-[12px] border p-3 text-sm ${
            comment.resolved
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
              : "border-black/[0.08] bg-white text-zinc-700 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-300"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="leading-6">{comment.text}</p>
            {!comment.resolved ? (
              <button
                type="button"
                onClick={() => onResolve(comment.commentId)}
                className="shrink-0 rounded-lg border border-black/[0.08] bg-white px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400"
              >
                Resolve
              </button>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Resolved
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{formatIso(comment.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function PlatformSection({
  projectId,
  platform,
  onMutate,
  pendingAction
}: {
  projectId: string;
  platform: SocialPlatformRecord;
  onMutate: (body: ActionBody) => Promise<void>;
  pendingAction: string | null;
}) {
  const activeVariant = getActiveVariant(platform);
  const [draft, setDraft] = useState(() => (activeVariant ? draftFromVariant(activeVariant) : null));
  const [comment, setComment] = useState("");
  const [scheduleFor, setScheduleFor] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [connectionName, setConnectionName] = useState(platform.connection?.accountName ?? "");
  const [connectionHandle, setConnectionHandle] = useState(platform.connection?.handle ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSlideIndex, setEditorSlideIndex] = useState(0);

  useEffect(() => {
    setDraft(activeVariant ? draftFromVariant(activeVariant) : null);
  }, [activeVariant]);

  useEffect(() => {
    setConnectionName(platform.connection?.accountName ?? "");
    setConnectionHandle(platform.connection?.handle ?? "");
  }, [platform.connection?.accountName, platform.connection?.handle]);

  useEffect(() => {
    if (!editorOpen) {
      return;
    }
    setEditorSlideIndex(0);
  }, [editorOpen, platform.activeVariantId]);

  const editableDraft = draft ?? (activeVariant ? draftFromVariant(activeVariant) : null);

  if (!editableDraft) {
    return (
      <section id={platform.platform} className="rounded-[16px] border border-black/[0.08] bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <PlatformBadge platform={platform.platform} />
          <button
            type="button"
            onClick={() => onMutate({ action: "regenerate", platform: platform.platform })}
            className="rounded-xl bg-[#0f172a] px-3 py-2 text-xs font-semibold text-white"
          >
            Generate drafts
          </button>
        </div>
      </section>
    );
  }

  const variants = platform.variants;
  const connectionLabel = platform.connection?.connected ? platform.connection.accountName || "Connected" : "Not connected";
  const scheduleLabel = platform.schedule ? `Scheduled for ${formatIso(platform.schedule.scheduledFor)}` : "Not scheduled";
  const publicationLabel = platform.publication?.status === "published" ? "Published" : "Draft";
  const isBusy = Boolean(pendingAction);
  const directConnect = platform.platform === "instagram" || platform.platform === "x";
  const previewSlides = editableDraft ? buildPreviewSlides(editableDraft) : [];
  const currentSlide = previewSlides[Math.min(editorSlideIndex, Math.max(previewSlides.length - 1, 0))] ?? null;
  const canPublish = Boolean(platform.connection?.connected);

  async function saveDraft() {
    if (!editableDraft) return;
    await onMutate({
      action: "update-variant",
      platform: platform.platform,
      variantId: editableDraft.variantId,
      title: editableDraft.title,
      body: editableDraft.body,
      segments: editableDraft.segments.split("\n").map((line) => line.trim()).filter(Boolean),
      hashtags: editableDraft.hashtags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      callToAction: editableDraft.callToAction,
      designNotes: editableDraft.designNotes.split("\n").map((line) => line.trim()).filter(Boolean),
      label: editableDraft.label,
      notes: "Edited in the social studio"
    });
  }

  async function addComment() {
    const nextComment = comment.trim();
    if (!nextComment) return;
    setComment("");
    await onMutate({
      action: "add-comment",
      platform: platform.platform,
      comment: nextComment
    });
  }

  async function scheduleDraft() {
    if (!scheduleFor) return;
    await onMutate({
      action: "schedule",
      platform: platform.platform,
      scheduledFor: new Date(scheduleFor).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: scheduleNotes.trim()
    });
  }

  async function connectAccount() {
    if (directConnect) {
      window.location.assign(`/api/social/${projectId}/connect?platform=${platform.platform}`);
      return;
    }

    await onMutate({
      action: "connect",
      platform: platform.platform,
      accountName: connectionName.trim(),
      handle: connectionHandle.trim()
    });
  }

  async function publishNow() {
    await onMutate({
      action: "publish",
      platform: platform.platform,
      externalUrl: platform.platform === "linkedin" ? null : ""
    });
  }

  function ContentEditorModal() {
    if (!editorOpen || !editableDraft || !currentSlide) {
      return null;
    }

    const previewTheme =
      platform.platform === "instagram"
        ? "bg-[linear-gradient(180deg,#17131f,#0b0d12)]"
        : platform.platform === "linkedin"
          ? "bg-[linear-gradient(180deg,#10213d,#0b0f18)]"
          : "bg-[linear-gradient(180deg,#15161b,#09090b)]";

    async function saveAndClose() {
      try {
        await saveDraft();
        setEditorOpen(false);
      } catch {
        // Keep the editor open so the user can fix the draft after a failed save.
      }
    }

    async function saveAndPublish() {
      try {
        await saveDraft();
        await publishNow();
        setEditorOpen(false);
      } catch {
        // Keep the editor open so publish errors can be corrected in place.
      }
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/[0.72] px-4 py-6 backdrop-blur-sm"
        onMouseDown={() => setEditorOpen(false)}
      >
        <div
          className="w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-[0_40px_120px_rgba(15,23,42,0.35)] dark:bg-[#0f1115]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="grid min-h-[760px] md:grid-cols-[minmax(0,1.06fr)_minmax(340px,0.94fr)]">
            <div className={`relative flex min-h-[420px] flex-col overflow-hidden p-6 text-white ${previewTheme}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-black/[0.40] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {editorSlideIndex + 1}/{previewSlides.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorSlideIndex((value) => (value > 0 ? value - 1 : previewSlides.length - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.40] text-white transition hover:bg-black/[0.55]"
                    aria-label="Previous slide"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M12.79 15.77a.75.75 0 0 1-.02-1.06L16.67 10l-3.9-4.71a.75.75 0 0 1 1.16-.96l4.5 5.4a.75.75 0 0 1 0 .96l-4.5 5.4a.75.75 0 0 1-1.14-.04z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorSlideIndex((value) => (value + 1) % previewSlides.length)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.40] text-white transition hover:bg-black/[0.55]"
                    aria-label="Next slide"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M7.21 4.23a.75.75 0 0 1 1.06.02L12.17 9.1a.75.75 0 0 1 0 .96l-3.9 4.71a.75.75 0 1 1-1.16-.96L10.99 10 7.19 5.19a.75.75 0 0 1 .02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-10 grid flex-1 content-between gap-10">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/[0.50]">
                    {platformName(platform.platform)} content editor
                  </p>
                  <h3 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                    {currentSlide.title}
                  </h3>
                  <p className="mt-5 max-w-xl whitespace-pre-line text-base leading-7 text-white/[0.78]">{currentSlide.body}</p>
                </div>

                <div className="rounded-[24px] border border-white/[0.10] bg-white/[0.06] p-4 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/[0.45]">Preview card</p>
                      <p className="mt-1 text-sm text-white/[0.70]">{currentSlide.label} · {previewSlides.length} cards in this pack</p>
                    </div>
                    <span className="rounded-full bg-white/[0.10] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.75]">
                      {platform.publication?.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-white/[0.10] bg-black/[0.20] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.45]">Footer</p>
                      <p className="mt-2 text-sm leading-6 text-white/[0.80]">{currentSlide.footer}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/[0.10] bg-black/[0.20] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.45]">Status</p>
                      <p className="mt-2 text-sm leading-6 text-white/[0.80]">
                        {platform.platform === "x" ? "Single post or thread" : "Single post or carousel"} ·{" "}
                        {platform.connection?.connected ? "Connected" : "Connection required"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {editableDraft.hashtags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((tag, index) => (
                        <span key={`${tag}-${index}`} className="rounded-full bg-white/[0.10] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.80]">
                          #{tag.replace(/^#/, "")}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-[420px] flex-col bg-white dark:bg-[#0f1115]">
              <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] px-6 py-5 dark:border-white/[0.08]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">Post Details</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">Review and refine</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {platformName(platform.platform)} · {platform.platform === "x" ? "thread or single post" : "carousel-ready"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:text-zinc-100"
                    aria-label="More actions"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <circle cx="10" cy="4.5" r="1.5" />
                      <circle cx="10" cy="10" r="1.5" />
                      <circle cx="10" cy="15.5" r="1.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:text-zinc-100"
                    aria-label="Close editor"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M4.47 4.47a.75.75 0 0 1 1.06 0L10 8.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L11.06 10l4.47 4.47a.75.75 0 1 1-1.06 1.06L10 11.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L8.94 10 4.47 5.53a.75.75 0 0 1 0-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="rounded-[18px] border border-orange-200 bg-orange-50/[0.80] p-4 text-sm text-zinc-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-100">
                  Edit the active draft here, then publish from the same modal when it’s ready.
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Title</span>
                    <input
                      value={editableDraft.title}
                      onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                      className="rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Description</span>
                    <textarea
                      value={editableDraft.body}
                      onChange={(event) => setDraft((current) => (current ? { ...current, body: event.target.value } : current))}
                      rows={7}
                      className="resize-none rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Slide notes</span>
                    <textarea
                      value={editableDraft.segments}
                      onChange={(event) => setDraft((current) => (current ? { ...current, segments: event.target.value } : current))}
                      rows={5}
                      placeholder="One slide or thread post per line"
                      className="resize-none rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Hashtags</span>
                      <input
                        value={editableDraft.hashtags}
                        onChange={(event) => setDraft((current) => (current ? { ...current, hashtags: event.target.value } : current))}
                        className="rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">CTA</span>
                      <input
                        value={editableDraft.callToAction}
                        onChange={(event) => setDraft((current) => (current ? { ...current, callToAction: event.target.value } : current))}
                        className="rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Design notes</span>
                    <textarea
                      value={editableDraft.designNotes}
                      onChange={(event) => setDraft((current) => (current ? { ...current, designNotes: event.target.value } : current))}
                      rows={4}
                      className="resize-none rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-black/[0.08] px-6 py-5 dark:border-white/[0.08]">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={saveAndClose}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    onClick={saveAndPublish}
                    disabled={isBusy || !canPublish}
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
                  >
                    Edit & Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id={platform.platform} className="rounded-[18px] border border-black/[0.08] bg-white/[0.95] p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-white/[0.08] dark:bg-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlatformBadge platform={platform.platform} />
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">{platformName(platform.platform)} drafts</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {platform.variants.length} variants · {connectionLabel} · {scheduleLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
          >
            Open editor
          </button>
          <button
            type="button"
            onClick={() => onMutate({ action: "regenerate", platform: platform.platform })}
            disabled={isBusy}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
          >
            Regenerate with comments
          </button>
          <button
            type="button"
            onClick={connectAccount}
            disabled={isBusy}
            className="rounded-xl bg-[#0f172a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {platform.connection?.connected ? "Reconnect" : "Connect"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.variantId}
            type="button"
            onClick={() => onMutate({ action: "select-variant", platform: platform.platform, variantId: variant.variantId })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              variant.variantId === platform.activeVariantId
                ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                : "border border-black/10 bg-white text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400"
            }`}
          >
            {variant.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="grid gap-4">
          <div className="rounded-[14px] border border-black/[0.08] bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Quick preview</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {platform.platform === "x" ? "Thread or single post" : "Single or carousel"} · {previewSlides.length} preview cards
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                {publicationLabel}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[16px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f1115]">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{editableDraft.title}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-600 dark:text-zinc-300">{editableDraft.body}</p>
              </div>
              {editableDraft.segments ? (
                <div className="grid gap-2">
                  {editableDraft.segments
                    .split("\n")
                    .map((segment) => segment.trim())
                    .filter(Boolean)
                    .map((segment, index) => (
                      <div key={`${segment}-${index}`} className="rounded-[12px] border border-black/[0.08] bg-white px-3 py-2 text-sm text-zinc-700 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-300">
                        <span className="mr-2 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
                          {index + 1}
                        </span>
                        {segment}
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className={`rounded-[14px] border p-4 dark:border-white/[0.08] dark:bg-white/5 ${platformAccent(platform.platform)} bg-white`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Connection</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {directConnect
                    ? "Use OAuth to connect the live publishing account."
                    : "Manual connection details are saved locally for the workspace."}
                </p>
              </div>
              <ConnectionPill connected={Boolean(platform.connection?.connected)} />
            </div>

            {directConnect ? (
              <div className="mt-4 grid gap-3 rounded-[12px] border border-black/[0.08] bg-white p-3 dark:border-white/10 dark:bg-[#0f1115]">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {platform.connection?.connected ? platform.connection.accountName || platformName(platform.platform) : `Connect ${platformName(platform.platform)}`}
                </p>
                <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {platform.connection?.connected
                    ? platform.connection.handle || platform.connection.profileUrl || "OAuth connected"
                    : `This opens ${platformName(platform.platform)} OAuth in a new tab and returns here when complete.`}
                </p>
                <button
                  type="button"
                  onClick={connectAccount}
                  disabled={isBusy}
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    platform.platform === "instagram"
                      ? "bg-[#f97316] hover:bg-[#ea580c]"
                      : "bg-[#0f172a] hover:bg-[#1e293b]"
                  }`}
                >
                  {platform.connection?.connected ? `Reconnect ${platformName(platform.platform)}` : `Connect ${platformName(platform.platform)}`}
                </button>
                {platform.connection?.profileUrl ? (
                  <a
                    href={platform.connection.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
                  >
                    View connected profile
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <input
                  value={connectionName}
                  onChange={(event) => setConnectionName(event.target.value)}
                  placeholder="Account name"
                  className="rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500/30 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                />
                <input
                  value={connectionHandle}
                  onChange={(event) => setConnectionHandle(event.target.value)}
                  placeholder="@handle"
                  className="rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500/30 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={connectAccount}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {platform.connection?.connected ? "Reconnect" : "Save connection"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Schedule</p>
            <div className="mt-3 grid gap-3">
              <input
                type="datetime-local"
                value={scheduleFor}
                onChange={(event) => setScheduleFor(event.target.value)}
                className="rounded-xl border border-emerald-500/15 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 outline-none focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/15 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
              />
              <textarea
                value={scheduleNotes}
                onChange={(event) => setScheduleNotes(event.target.value)}
                rows={2}
                placeholder="Scheduling notes"
                className="resize-none rounded-xl border border-emerald-500/15 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 outline-none focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/15 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={scheduleDraft}
                disabled={isBusy || !scheduleFor}
                className="rounded-xl bg-[#16a34a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save schedule
              </button>
              {platform.schedule ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{scheduleLabel}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[14px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Comments</p>
            <div className="mt-3 grid gap-3">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                placeholder="Add a review note or improvement request"
                className="resize-none rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500/30 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-[#0f1115] dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={addComment}
                disabled={isBusy || !comment.trim()}
                className="rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add comment
              </button>
              <CommentList
                comments={platform.comments}
                onResolve={(commentId) =>
                  onMutate({
                    action: "resolve-comment",
                    platform: platform.platform,
                    commentId
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-white/5">{platform.variants.length} variants</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-white/5">{platform.editHistory.length} edits</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-white/5">{platform.comments.length} comments</span>
      </div>

      {editorOpen ? <ContentEditorModal /> : null}
    </section>
  );
}

export default function SocialProjectClient({ initialProject }: Props) {
  const [project, setProject] = useState(initialProject);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  async function onMutate(body: ActionBody) {
    setPendingAction(String(body.action ?? "update"));
    setError(null);
    try {
      const nextProject = await patchProject(project.projectId, body);
      if (nextProject) {
        setProject(nextProject);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update social project.");
    } finally {
      setPendingAction(null);
    }
  }

  const stats = useMemo(
    () => ({
      connected: project.platforms.filter((platform) => platform.connection?.connected).length,
      scheduled: project.platforms.filter((platform) => Boolean(platform.schedule)).length,
      published: project.platforms.filter((platform) => platform.publication?.status === "published").length,
      comments: project.platforms.reduce((count, platform) => count + platform.comments.length, 0)
    }),
    [project]
  );

  return (
    <section className="grid gap-5 px-6 py-6">
      <div id="overview" className="rounded-[16px] border border-violet-500/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,255,0.92))] p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
              Social project
            </div>
            <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">{project.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {project.source.mode === "url"
                ? `Source URL: ${project.source.url || "n/a"}`
                : project.source.seedArticleTitle
                  ? `Seeded from approved article: ${project.source.seedArticleTitle}`
                  : `Topic: ${project.source.topic}`}
            </p>
            {project.notes ? <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{project.notes}</p> : null}
          </div>
          <div className="grid gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="rounded-full bg-white px-3 py-1 font-semibold dark:bg-white/5">{stats.connected} connected</span>
            <span className="rounded-full bg-white px-3 py-1 font-semibold dark:bg-white/5">{stats.scheduled} scheduled</span>
            <span className="rounded-full bg-white px-3 py-1 font-semibold dark:bg-white/5">{stats.comments} comments</span>
            <span className="rounded-full bg-white px-3 py-1 font-semibold dark:bg-white/5">{stats.published} published</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[14px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Research</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {project.research?.sourceSummary || "No research saved yet."}
            </p>
          </div>
          <div className="rounded-[14px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">References</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{project.research?.references.length ?? 0}</p>
          </div>
          <div className="rounded-[14px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Platforms</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{project.platforms.length}</p>
          </div>
          <div className="rounded-[14px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Updated</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{formatIso(project.updatedAt)}</p>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">{error}</div> : null}

      <div className="grid gap-5">
        {project.platforms.map((platform) => (
          <PlatformSection
            projectId={project.projectId}
            key={platform.platform}
            platform={platform}
            onMutate={onMutate}
            pendingAction={pendingAction}
          />
        ))}
      </div>
    </section>
  );
}
