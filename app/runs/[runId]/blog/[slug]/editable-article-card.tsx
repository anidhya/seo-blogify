"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import WorkflowProgressBar from "@/app/components/workflow-progress";
import CopyButton from "./copy-button";
import { copyTextToClipboard } from "@/lib/clipboard";

type InternalLink = {
  anchorText: string;
  targetUrl: string;
  placement: string;
  rationale: string;
};

type Props = {
  runId: string;
  articleSlug: string;
  markdown: string;
  imagePrompts?: string[];
  internalLinks?: InternalLink[];
};

type ViewMode = "article" | "raw" | "html" | "edit";

async function updateBlog(runId: string, articleSlug: string, markdown: string) {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "update-blog", runId, articleSlug, markdown })
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok || data.error) throw new Error(data.error || "Failed to update article.");
  return data;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-[#0f7b49] underline decoration-[#0f7b49]/30 underline-offset-4 hover:decoration-[#0f7b49]/60">$1</a>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.92em] text-zinc-900 dark:bg-white/10 dark:text-zinc-100">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${formatInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    if (/^#{1,3}\s/.test(line)) {
      flushParagraph(); flushList();
      const level = line.match(/^#{1,3}/)?.[0].length ?? 1;
      const content = line.replace(/^#{1,3}\s/, "");
      blocks.push(`<h${level}>${formatInlineMarkdown(content)}</h${level}>`);
      continue;
    }
    if (/^-\s/.test(line)) { flushParagraph(); listItems.push(line.replace(/^-\s/, "")); continue; }
    paragraph.push(line);
  }
  flushParagraph(); flushList();
  return blocks.join("\n") || "<p></p>";
}

// Inject internal links into a text string, returning React nodes
function applyInternalLinks(text: string, links: InternalLink[]): ReactNode {
  if (!links.length) return text;
  const sorted = [...links].sort((a, b) => b.anchorText.length - a.anchorText.length);
  const escaped = sorted.map((l) => l.anchorText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const match = sorted.find((l) => l.anchorText.toLowerCase() === part.toLowerCase());
        if (match) {
          return (
            <a
              key={i}
              href={match.targetUrl}
              target="_blank"
              rel="noreferrer"
              title={`Internal link: ${match.rationale}`}
              className="border-b border-[#0f7b49]/40 text-[#0f7b49] hover:border-[#0f7b49] dark:text-[#4ade80]"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}

function ImagePlaceholder({ prompt, index }: { prompt: string; index: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await copyTextToClipboard(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.warn("Image prompt copy failed:", error);
      setCopied(false);
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-dashed border-violet-300 bg-violet-50/60 dark:border-violet-700/50 dark:bg-violet-900/10">
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-violet-200 px-4 py-2 dark:border-violet-700/40">
        <div className="flex items-center gap-2">
          <span className="text-base">🖼️</span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Image {index + 1} — Place your image here
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-medium text-violet-600 transition hover:bg-violet-50 dark:border-violet-700/40 dark:bg-white/5 dark:text-violet-400"
        >
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-violet-300 bg-violet-100/60 text-2xl dark:border-violet-700/40 dark:bg-violet-900/20">
          📷
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-500">AI image prompt</p>
          <p className="mt-1 text-xs leading-relaxed text-violet-800 dark:text-violet-300">{prompt}</p>
        </div>
      </div>
    </div>
  );
}

function renderMarkdownWithEnhancements(markdown: string, imagePrompts: string[], internalLinks: InternalLink[]) {
  const lines = markdown.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let h2Count = 0;

  // Count total H2s to distribute images evenly
  const totalH2 = lines.filter((l) => /^## /.test(l.trim())).length;
  // Insert image after which H2 index (0-based): spread 3 images across sections
  const imageAtH2 = imagePrompts.map((_, i) =>
    totalH2 <= 1 ? i : Math.round((i / (imagePrompts.length - 1 || 1)) * (totalH2 - 1))
  );

  function flushParagraph() {
    if (!paragraph.length) return;
    const text = paragraph.join(" ");
    elements.push(
      <p key={`p-${elements.length}`} className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        {applyInternalLinks(text, internalLinks)}
      </p>
    );
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    const items = [...listItems];
    elements.push(
      <ul key={`ul-${elements.length}`} className="grid gap-2 pl-5 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="list-disc">
            {applyInternalLinks(item, internalLinks)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) { flushParagraph(); flushList(); continue; }

    if (/^#{1,3}\s/.test(line)) {
      flushParagraph(); flushList();
      const level = line.match(/^#{1,3}/)?.[0].length ?? 1;
      const content = line.replace(/^#{1,3}\s/, "").replace(/^#{1,3}\s/, "");
      const headingClass =
        level === 1
          ? "text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          : level === 2
            ? "text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            : "text-base font-semibold text-zinc-800 dark:text-zinc-200";
      const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
      elements.push(<Tag key={`h-${elements.length}`} className={headingClass}>{content}</Tag>);

      // After H2, maybe inject an image
      if (level === 2) {
        const imgIdx = imageAtH2.indexOf(h2Count);
        if (imgIdx !== -1 && imagePrompts[imgIdx]) {
          elements.push(<ImagePlaceholder key={`img-${imgIdx}`} prompt={imagePrompts[imgIdx]} index={imgIdx} />);
        }
        h2Count++;
      }
      continue;
    }

    if (/^-\s/.test(line)) { flushParagraph(); listItems.push(line.replace(/^-\s/, "")); continue; }

    paragraph.push(line);
  }

  flushParagraph(); flushList();

  // If no H2s were found, inject images at top, middle, end
  if (h2Count === 0 && imagePrompts.length > 0) {
    const total = elements.length;
    const positions = imagePrompts.map((_, i) => Math.round((i / imagePrompts.length) * total));
    const withImages: ReactNode[] = [];
    elements.forEach((el, i) => {
      const imgIdx = positions.indexOf(i);
      if (imgIdx !== -1 && imagePrompts[imgIdx]) {
        withImages.push(<ImagePlaceholder key={`img-${imgIdx}`} prompt={imagePrompts[imgIdx]} index={imgIdx} />);
      }
      withImages.push(el);
    });
    return <div className="grid gap-4">{withImages}</div>;
  }

  return <div className="grid gap-4">{elements}</div>;
}

export default function EditableArticleCard({ runId, articleSlug, markdown, imagePrompts = [], internalLinks = [] }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(markdown);
  const [viewMode, setViewMode] = useState<ViewMode>("article");
  const [status, setStatus] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"update-blog" | null>(null);
  const [isPending, startTransition] = useTransition();
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });
  const htmlPreview = useMemo(() => markdownToHtml(draft), [draft]);

  useEffect(() => {
    if (!activeAction || !workflowProgress?.isComplete) return;
    const timer = setTimeout(() => setActiveAction(null), 900);
    return () => clearTimeout(timer);
  }, [activeAction, workflowProgress?.isComplete]);

  const visibleProgress =
    activeAction && workflowProgress
      ? workflowProgress
      : activeAction
        ? { action: activeAction, percent: 8, stageLabel: "Saving article edits", updatedAt: new Date().toISOString(), isComplete: false }
        : null;

  const isEditing = viewMode === "edit";

  function cancelEdit() { setDraft(markdown); setViewMode("article"); setStatus(null); }

  function saveEdit() {
    startTransition(async () => {
      try {
        setStatus(null);
        setActiveAction("update-blog");
        await updateBlog(runId, articleSlug, draft.trim());
        setViewMode("article");
        setStatus("Article updated.");
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Unknown error");
        setActiveAction(null);
      }
    });
  }

  const tabs: { mode: ViewMode; label: string }[] = [
    { mode: "article", label: "Preview" },
    { mode: "edit", label: "Edit" },
    { mode: "raw", label: "Markdown" },
    { mode: "html", label: "HTML" }
  ];

  return (
    <article className="rounded-2xl border border-black/8 bg-white dark:border-white/8 dark:bg-white/3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 px-4 py-3 dark:border-white/8">
        <div className="flex gap-1 rounded-lg border border-black/8 bg-zinc-50 p-1 dark:border-white/8 dark:bg-white/5">
          {tabs.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                viewMode === mode
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-white/15 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <CopyButton text={draft} label="Copy" ariaLabel="Copy article markdown" />
          {isEditing && (
            <>
              <button
                type="button"
                onClick={saveEdit}
                disabled={isPending || activeAction === "update-blog"}
                className="rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1e293b] disabled:opacity-50"
              >
                {activeAction === "update-blog" ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isPending}
                className="rounded-lg border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {visibleProgress && <WorkflowProgressBar progress={visibleProgress} label="Saving edits" variant="top" />}

      {/* Internal links legend (if any) */}
      {viewMode === "article" && internalLinks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-black/6 bg-amber-50/60 px-4 py-2 dark:border-white/6 dark:bg-amber-900/10">
          <span className="text-sm">🔗</span>
          <span className="text-xs text-amber-700 dark:text-amber-400">
            <strong>{internalLinks.length} internal link{internalLinks.length !== 1 ? "s" : ""}</strong> highlighted in the article — hover to see rationale.
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {isEditing ? (
          <textarea
            className="min-h-[520px] w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm leading-7 text-zinc-800 outline-none transition focus:border-[#0f7b49]/40 focus:ring-2 focus:ring-[#0f7b49]/15 dark:border-white/8 dark:bg-[#0f1115] dark:text-zinc-100"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Editable article markdown"
          />
        ) : viewMode === "raw" ? (
          <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-700 dark:text-zinc-300">{draft}</pre>
        ) : viewMode === "html" ? (
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-black/8 bg-zinc-50 p-4 font-mono text-[13px] leading-6 text-zinc-800 dark:border-white/8 dark:bg-white/5 dark:text-zinc-200">
            {htmlPreview}
          </pre>
        ) : (
          renderMarkdownWithEnhancements(draft, imagePrompts, internalLinks)
        )}
      </div>

      {status && <p className="px-5 pb-4 text-sm text-zinc-500 dark:text-zinc-400">{status}</p>}
    </article>
  );
}
