"use client";

import type { WorkflowProgress } from "@/lib/types";

type Props = {
  progress: WorkflowProgress | null;
  label?: string;
  className?: string;
  variant?: "panel" | "top";
};

export default function WorkflowProgressBar({ progress, label, className = "", variant = "panel" }: Props) {
  if (!progress) {
    return null;
  }

  if (variant === "top") {
    return (
      <div className="fixed inset-x-0 top-0 z-[120] px-4 pt-3">
        <div
          className="mx-auto max-w-[min(1600px,80vw)] rounded-[12px] border border-[#0f7b49]/20 bg-gradient-to-r from-[#0d1117] via-[#111827] to-[#0f7b49] p-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.24)]"
          role="status"
          aria-live="polite"
          aria-busy={!progress.isComplete}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full bg-[#86efac] ${progress.isComplete ? "" : "animate-pulse"}`} />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{label ?? "Working"}</p>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-white">{progress.stageLabel}</p>
            </div>
            <p className="shrink-0 tabular-nums text-xl font-semibold text-white">{Math.round(progress.percent)}%</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#86efac] via-[#34d399] to-[#0f7b49] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 rounded-[12px] border border-[#0f7b49]/20 bg-gradient-to-br from-white via-[#f7fbf8] to-[#eef8f1] p-5 shadow-[0_16px_40px_rgba(15,123,73,0.08)] dark:border-white/8 dark:bg-gradient-to-br dark:from-[#121318] dark:via-[#17181d] dark:to-[#0f172a] dark:shadow-[0_16px_40px_rgba(0,0,0,0.24)] ${className}`}
      role="status"
      aria-live="polite"
      aria-busy={!progress.isComplete}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7b49]/20 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f7b49] dark:border-[#0f7b49]/25 dark:bg-[#0f7b49]/10 dark:text-[#86efac]">
            <span className={`h-2 w-2 rounded-full bg-[#0f7b49] ${progress.isComplete ? "" : "animate-pulse"}`} />
            {label ?? "Working"}
          </div>
          <p className="mt-2 truncate text-base font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">{progress.stageLabel}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {progress.isComplete ? "Task complete." : "Working in the background. This banner updates automatically."}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
            {Math.round(progress.percent)}%
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Progress</p>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0f7b49] via-[#22c55e] to-[#86efac] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>
    </div>
  );
}
