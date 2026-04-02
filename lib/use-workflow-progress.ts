"use client";

import { useEffect, useState } from "react";
import type { WorkflowProgress } from "@/lib/types";

type Options = {
  runId: string | null;
  enabled: boolean;
  pollMs?: number;
};

export default function useWorkflowProgress({ runId, enabled, pollMs = 1200 }: Options) {
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);

  useEffect(() => {
    if (!enabled || !runId) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const response = await fetch(`/api/workflow?runId=${encodeURIComponent(String(runId))}`, {
          cache: "no-store"
        });
        const data = (await response.json()) as { run?: { manifest?: { progress?: WorkflowProgress } } };

        if (!cancelled) {
          setProgress(data.run?.manifest?.progress ?? null);
        }
      } catch {
        if (!cancelled) {
          setProgress(null);
        }
      }
    }

    poll();
    timer = setInterval(poll, pollMs);

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [enabled, pollMs, runId]);

  return progress;
}
