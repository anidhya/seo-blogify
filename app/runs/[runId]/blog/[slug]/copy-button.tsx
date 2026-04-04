"use client";

import { useState } from "react";

type Props = {
  text: string;
  label: string;
  ariaLabel?: string;
};

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
      />
    </svg>
  );
}

export default function CopyButton({ text, label, ariaLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/8"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void handleCopy();
      }}
      aria-label={ariaLabel ?? label}
      title={label}
    >
      <CopyIcon />
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
