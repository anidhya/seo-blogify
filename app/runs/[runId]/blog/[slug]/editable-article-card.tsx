"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import WorkflowProgressBar from "@/app/components/workflow-progress";
import CopyButton from "./copy-button";

type Props = {
  runId: string;
  markdown: string;
};

async function updateBlog(runId: string, markdown: string) {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      step: "update-blog",
      runId,
      markdown
    })
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || "Failed to update article.");
  }

  return data;
}

export default function EditableArticleCard({ runId, markdown }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(markdown);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"update-blog" | null>(null);
  const [isPending, startTransition] = useTransition();
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });

  const articleCopyText = useMemo(() => draft, [draft]);

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
            stageLabel: "Saving article edits",
            updatedAt: new Date().toISOString(),
            isComplete: false
          }
        : null;

  function cancelEdit() {
    setDraft(markdown);
    setEditing(false);
    setStatus(null);
  }

  function saveEdit() {
    startTransition(async () => {
      try {
        setStatus(null);
        setActiveAction("update-blog");
        await updateBlog(runId, draft.trim());
        setEditing(false);
        setStatus("Article updated.");
        router.refresh();
      } catch (caughtError) {
        setStatus(caughtError instanceof Error ? caughtError.message : "Unknown error");
        setActiveAction(null);
      }
    });
  }

  return (
    <article className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4">
      <div className="flex items-start justify-between gap-4 max-md:flex-col">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Article</h2>
          <p className="mt-1 text-sm text-neutral-600">Edit the draft in place, then save it back to the run.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={articleCopyText} label="Copy article" ariaLabel="Copy article markdown to clipboard" />
          {editing ? (
            <>
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#c35d2e] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b65228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/30 disabled:cursor-progress disabled:opacity-60"
                type="button"
                onClick={saveEdit}
                disabled={isPending || activeAction === "update-blog"}
              >
                {activeAction === "update-blog" ? "Saving…" : "Save"}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
                type="button"
                onClick={cancelEdit}
                disabled={isPending || activeAction === "update-blog"}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
              type="button"
              onClick={() => setEditing(true)}
            >
              Edit article
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          className="mt-4 min-h-[520px] w-full rounded-3xl border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-neutral-800 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Editable article markdown"
        />
        ) : (
          <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">{markdown}</div>
      )}

      {visibleProgress && activeAction === "update-blog" ? (
        <WorkflowProgressBar progress={visibleProgress} label="Saving article edits" className="mt-4" />
      ) : null}

      {status ? <p className="mt-3 text-sm text-neutral-600">{status}</p> : null}
    </article>
  );
}
