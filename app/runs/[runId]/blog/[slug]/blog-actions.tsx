"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import WorkflowProgressBar from "@/app/components/workflow-progress";

type Props = {
  runId: string;
  slug: string;
  canApprove: boolean;
};

type WorkflowResponse = {
  runId?: string;
  linkedinUrl?: string | null;
  error?: string;
};

async function postWorkflow(payload: Record<string, unknown>) {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as WorkflowResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error || "Workflow request failed.");
  }

  return data;
}

export default function BlogActions({ runId, slug, canApprove }: Props) {
  const router = useRouter();
  const [regenerationComments, setRegenerationComments] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showRegeneration, setShowRegeneration] = useState(true);
  const [showApproval, setShowApproval] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"regenerate-blog" | "approve-blog" | null>(null);
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
            stageLabel: activeAction === "regenerate-blog" ? "Starting regeneration" : "Starting approval",
            updatedAt: new Date().toISOString(),
            isComplete: false
          }
        : null;

  function submitRegeneration() {
    if (!regenerationComments.trim()) {
      setError("Add comments before regenerating.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("regenerate-blog");
        await postWorkflow({
          step: "regenerate-blog",
          runId,
          articleSlug: slug,
          comments: regenerationComments.trim()
        });
        setRegenerationComments("");
        router.refresh();
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setActiveAction(null);
      }
    });
  }

  function submitApproval(approved: boolean) {
    if (approved && !canApprove) {
      setError("The blog must pass the quality gate before it can be approved.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setActiveAction("approve-blog");
        const data = (await postWorkflow({
          step: "approve-blog",
          runId,
          articleSlug: slug,
          approved,
          comments: approvalNotes.trim()
        })) as WorkflowResponse;
        setApprovalNotes("");
        if (approved) {
          router.push((data.linkedinUrl || `/runs/${runId}/blog/${slug}/linkedin`) as never);
        } else {
          router.refresh();
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setActiveAction(null);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        <a
          className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
          href={`/runs/${runId}/blog/${slug}`}
          target="_blank"
          rel="noreferrer"
        >
          Open in new tab
        </a>
      </div>

      {visibleProgress ? (
        <WorkflowProgressBar
          progress={visibleProgress}
          label={visibleProgress.action === "approve-blog" ? "Approval" : "Regeneration"}
          variant="top"
        />
      ) : null}

      <section className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <h4 className="text-base font-semibold text-neutral-900">Approval process</h4>
            <p className="mt-1 text-sm text-neutral-600">Approve the current draft or send it back with notes.</p>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
            type="button"
            onClick={() => setShowApproval((current) => !current)}
          >
            {showApproval ? "Hide" : "Show"}
          </button>
        </div>

        {showApproval ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-neutral-800" htmlFor="approval-notes">
                Approval notes
              </label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
                id="approval-notes"
                name="approvalNotes"
                autoComplete="off"
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                placeholder="Add reviewer notes or sign-off comments…"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#c35d2e] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b65228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/30 disabled:cursor-progress disabled:opacity-60"
                type="button"
                onClick={() => submitApproval(true)}
                disabled={isPending || activeAction === "approve-blog" || !canApprove}
              >
                {activeAction === "approve-blog" ? "Saving…" : "Approve for publish"}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25 disabled:cursor-progress disabled:opacity-60"
                type="button"
                onClick={() => submitApproval(false)}
                disabled={isPending || activeAction === "approve-blog"}
              >
                Needs revision
              </button>
            </div>
            {!canApprove ? (
              <p className="text-sm text-neutral-600">Quality gate must pass before publish approval is enabled.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <h4 className="text-base font-semibold text-neutral-900">Regenerate blog</h4>
            <p className="mt-1 text-sm text-neutral-600">Add editorial notes for the next rewrite pass.</p>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
            type="button"
            onClick={() => setShowRegeneration((current) => !current)}
          >
            {showRegeneration ? "Hide" : "Show"}
          </button>
        </div>

        {showRegeneration ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-neutral-800" htmlFor="regen-comments">
                Regeneration comments
              </label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
                id="regen-comments"
                name="regenerationComments"
                autoComplete="off"
                value={regenerationComments}
                onChange={(event) => setRegenerationComments(event.target.value)}
                placeholder="Tell the model what to improve: stronger intro, fewer generic phrases, more concrete examples…"
              />
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#c35d2e] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b65228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/30 disabled:cursor-progress disabled:opacity-60"
                type="button"
                onClick={submitRegeneration}
                disabled={isPending || activeAction === "regenerate-blog"}
              >
                {activeAction === "regenerate-blog" ? "Updating…" : "Submit regeneration"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
