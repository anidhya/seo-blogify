"use client";

import type { WorkflowProgress } from "@/lib/types";

type Props = {
  progress: WorkflowProgress | null;
  label?: string;
  className?: string;
};

export default function WorkflowProgressBar({ progress, label, className = "" }: Props) {
  if (!progress) {
    return null;
  }

  return (
    <div className={`grid gap-2 rounded-2xl border border-black/10 bg-white/80 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {label ?? "Working"}
          </p>
          <p className="mt-1 text-sm font-medium text-neutral-900">{progress.stageLabel}</p>
        </div>
        <p className="text-sm font-semibold text-neutral-900">{Math.round(progress.percent)}%</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full bg-[#c35d2e] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>
    </div>
  );
}
