"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  runId: string;
  slug: string;
  disabled?: boolean;
};

async function createSocialProject(runId: string, slug: string) {
  const response = await fetch("/api/social", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seedRunId: runId, seedArticleSlug: slug })
  });
  const data = (await response.json()) as { projectId?: string; error?: string };
  if (!response.ok || data.error || !data.projectId) {
    throw new Error(data.error || "Unable to create social project.");
  }
  return data.projectId;
}

export default function SocialHandoffButton({ runId, slug, disabled = false }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const projectId = await createSocialProject(runId, slug);
        router.push(`/social/${projectId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create social project.");
      }
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className="inline-flex items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:text-violet-300"
      >
        {isPending ? "Creating social project…" : "Send to Social Studio"}
      </button>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
