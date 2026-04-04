"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import useWorkflowProgress from "@/lib/use-workflow-progress";
import WorkflowProgressBar from "@/app/components/workflow-progress";
import CopyButton from "./copy-button";

type Props = {
  runId: string;
  articleSlug: string;
  markdown: string;
};

type ViewMode = "article" | "raw" | "html" | "edit";

async function updateBlog(runId: string, articleSlug: string, markdown: string) {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      step: "update-blog",
      runId,
      articleSlug,
      markdown
    })
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || "Failed to update article.");
  }

  return data;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      flushParagraph();
      flushList();
      const level = line.match(/^#{1,3}/)?.[0].length ?? 1;
      const content = line.replace(/^#{1,3}\s/, "");
      blocks.push(`<h${level}>${formatInlineMarkdown(content)}</h${level}>`);
      continue;
    }

    if (/^-\s/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^-\s/, ""));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.join("\n") || "<p></p>";
}

function renderMarkdownPreview(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    elements.push(
      <p key={`p-${elements.length}`} className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        {paragraph.join(" ")}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems;
    elements.push(
      <ul key={`ul-${elements.length}`} className="grid gap-2 pl-5 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      flushParagraph();
      flushList();
      const level = line.match(/^#{1,3}/)?.[0].length ?? 1;
      const content = line.replace(/^#{1,3}\s/, "");
      const headingClass =
        level === 1 ? "text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50" : level === 2 ? "text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50" : "text-lg font-semibold text-zinc-950 dark:text-zinc-50";
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      elements.push(
        <Tag key={`h-${elements.length}`} className={headingClass}>
          {content.replace(/^#{1,3}\s/, "")}
        </Tag>
      );
      continue;
    }

    if (/^-\s/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^-\s/, ""));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return <div className="grid gap-4">{elements}</div>;
}

export default function EditableArticleCard({ runId, articleSlug, markdown }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(markdown);
  const [viewMode, setViewMode] = useState<ViewMode>("article");
  const [status, setStatus] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"update-blog" | null>(null);
  const [isPending, startTransition] = useTransition();
  const workflowProgress = useWorkflowProgress({ runId, enabled: Boolean(activeAction) });

  const articleCopyText = useMemo(() => draft, [draft]);
  const htmlPreview = useMemo(() => markdownToHtml(draft), [draft]);

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

  const isEditing = viewMode === "edit";

  function cancelEdit() {
    setDraft(markdown);
    setViewMode("article");
    setStatus(null);
  }

  function saveEdit() {
    startTransition(async () => {
      try {
        setStatus(null);
        setActiveAction("update-blog");
        await updateBlog(runId, articleSlug, draft.trim());
        setViewMode("article");
        setStatus("Article updated.");
        router.refresh();
      } catch (caughtError) {
        setStatus(caughtError instanceof Error ? caughtError.message : "Unknown error");
        setActiveAction(null);
      }
    });
  }

  return (
    <article className="rounded-[16px] border border-black/8 bg-transparent p-4 shadow-none dark:border-white/8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Article</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Article</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Copy, edit, view raw markdown, or inspect the generated HTML.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={articleCopyText} label="Copy" ariaLabel="Copy article markdown to clipboard" />
          <button
            className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/20 ${
              isEditing
                ? "border-[#0f7b49]/20 bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#86efac]"
                : "border-black/10 bg-white/80 text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            }`}
            type="button"
            onClick={() => setViewMode("edit")}
          >
            Edit
          </button>
          <button
            className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/20 ${
              viewMode === "raw"
                ? "border-[#0f7b49]/20 bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#86efac]"
                : "border-black/10 bg-white/80 text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            }`}
            type="button"
            onClick={() => setViewMode("raw")}
          >
            Raw
          </button>
          <button
            className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/20 ${
              viewMode === "html"
                ? "border-[#0f7b49]/20 bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#86efac]"
                : "border-black/10 bg-white/80 text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            }`}
            type="button"
            onClick={() => setViewMode("html")}
          >
            HTML
          </button>
          <button
            className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/20 ${
              viewMode === "article"
                ? "border-[#0f7b49]/20 bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#86efac]"
                : "border-black/10 bg-white/80 text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            }`}
            type="button"
            onClick={() => setViewMode("article")}
          >
            Article
          </button>
          {isEditing ? (
            <>
              <button
                className="inline-flex items-center justify-center rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 disabled:cursor-progress disabled:opacity-60 dark:bg-[#0f7b49] dark:hover:bg-[#0c6a3f]"
                type="button"
                onClick={saveEdit}
                disabled={isPending || activeAction === "update-blog"}
              >
                {activeAction === "update-blog" ? "Saving…" : "Save"}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                type="button"
                onClick={cancelEdit}
                disabled={isPending || activeAction === "update-blog"}
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      </div>

      {visibleProgress ? <WorkflowProgressBar progress={visibleProgress} label="Saving edits" variant="top" /> : null}

      <div className="mt-4 rounded-[16px] border border-black/8 bg-white/60 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)] dark:border-white/8 dark:bg-white/5">
        {isEditing ? (
          <textarea
            className="min-h-[520px] w-full rounded-[12px] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-zinc-800 outline-none transition focus:border-[#0f7b49] focus:ring-2 focus:ring-[#0f7b49]/20 dark:border-white/8 dark:bg-[#0f1115] dark:text-zinc-100"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Editable article markdown"
          />
        ) : viewMode === "raw" ? (
          <pre className="whitespace-pre-wrap break-words font-body text-sm leading-7 text-zinc-700 dark:text-zinc-300">{draft}</pre>
        ) : viewMode === "html" ? (
          <pre className="whitespace-pre-wrap break-words rounded-[12px] border border-black/8 bg-black/[0.02] p-4 font-mono text-[13px] leading-6 text-zinc-800 dark:border-white/8 dark:bg-white/5 dark:text-zinc-200">
            {htmlPreview}
          </pre>
        ) : (
          <div className="grid gap-4">{renderMarkdownPreview(draft)}</div>
        )}
      </div>

      {status ? <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{status}</p> : null}
    </article>
  );
}
