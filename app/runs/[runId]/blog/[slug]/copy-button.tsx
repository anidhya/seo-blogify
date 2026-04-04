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

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M9.2 16.2 4.9 12l-1.4 1.4 5.7 5.7L20.5 7.8 19.1 6.4 9.2 16.2Z"
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/80 text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/8"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void handleCopy();
      }}
      aria-label={ariaLabel ?? label}
      title={copied ? "Copied" : label}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}
