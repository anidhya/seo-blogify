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
          className="mx-auto max-w-[min(1600px,80vw)] rounded-[1.5rem] border border-[#c35d2e]/20 bg-gradient-to-r from-[#3a1c12] via-[#5a2a19] to-[#8f4524] p-3 text-white shadow-[0_24px_80px_rgba(58,28,18,0.35)]"
          role="status"
          aria-live="polite"
          aria-busy={!progress.isComplete}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full bg-[#f7b58a] ${progress.isComplete ? "" : "animate-pulse"}`} />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{label ?? "Working"}</p>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-white">{progress.stageLabel}</p>
            </div>
            <p className="shrink-0 tabular-nums text-xl font-semibold text-white">{Math.round(progress.percent)}%</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f7b58a] via-[#f2c099] to-[#fff1e4] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 rounded-[1.75rem] border border-[#c35d2e]/20 bg-gradient-to-br from-[#fff6ef] via-white to-[#fffaf4] p-5 shadow-[0_24px_80px_rgba(195,93,46,0.18)] ${className}`}
      role="status"
      aria-live="polite"
      aria-busy={!progress.isComplete}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c35d2e]/20 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a4520]">
            <span className={`h-2 w-2 rounded-full bg-[#c35d2e] ${progress.isComplete ? "" : "animate-pulse"}`} />
            {label ?? "Working"}
          </div>
          <p className="mt-2 truncate text-base font-semibold tracking-[-0.02em] text-neutral-950">{progress.stageLabel}</p>
          <p className="mt-1 text-sm text-neutral-600">
            {progress.isComplete ? "Task complete." : "Working in the background. This banner updates automatically."}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
            {Math.round(progress.percent)}%
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Progress</p>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c35d2e] via-[#e07b42] to-[#f2a46f] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>
    </div>
  );
}
