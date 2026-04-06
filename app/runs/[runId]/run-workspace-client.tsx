"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RunBundle } from "@/lib/storage";
import type { BrandAnalysis } from "@/lib/types";

type Props = { runId: string; run: RunBundle };

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function BrandLogo({ websiteUrl, companyName, size = 56 }: { websiteUrl: string; companyName: string; size?: number }) {
  const domain = getDomain(websiteUrl);
  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const [failed, setFailed] = useState(false);
  const letter = (companyName || domain).slice(0, 1).toUpperCase();

  if (failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f7b49,#111827)] font-bold text-white shadow-sm"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {letter}
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-white dark:border-white/10 dark:bg-white/8"
      style={{ width: size, height: size }}
    >
      <img
        src={favicon}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain p-2"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── Inline editable field components ──

function EditableText({
  value,
  onSave,
  label,
  multiline = false,
  rows = 3,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  label: string;
  multiline?: boolean;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (draft.trim() === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  function cancel() { setDraft(value); setEditing(false); }

  if (!editing) {
    return (
      <div className="group relative">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{value}</p>
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true); }}
          aria-label={`Edit ${label}`}
          className="absolute right-0 top-0 hidden rounded-lg border border-black/8 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500 shadow-sm transition hover:text-zinc-900 group-hover:flex dark:border-white/10 dark:bg-white/8 dark:hover:text-zinc-100"
        >
          ✎ Edit
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {multiline ? (
        <textarea
          autoFocus
          rows={rows}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full resize-y rounded-xl border border-[#0f7b49]/40 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-2 ring-[#0f7b49]/15 dark:border-[#0f7b49]/30 dark:bg-white/8 dark:text-zinc-100"
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="w-full rounded-xl border border-[#0f7b49]/40 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-2 ring-[#0f7b49]/15 dark:border-[#0f7b49]/30 dark:bg-white/8 dark:text-zinc-100"
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#0f7b49] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d6b3f] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="rounded-lg border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditableList({
  items,
  onSave,
  label,
  bulletChar = "•",
}: {
  items: string[];
  onSave: (v: string[]) => Promise<void>;
  label: string;
  bulletChar?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items.join("\n"));
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = draft.split("\n").map((l) => l.trim()).filter(Boolean);
    setSaving(true);
    await onSave(parsed);
    setSaving(false);
    setEditing(false);
  }

  function cancel() { setDraft(items.join("\n")); setEditing(false); }

  if (!editing) {
    return (
      <div className="group relative">
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="mt-0.5 shrink-0 text-[#0f7b49]">{bulletChar}</span>
              {item}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => { setDraft(items.join("\n")); setEditing(true); }}
          aria-label={`Edit ${label}`}
          className="absolute right-0 top-0 hidden rounded-lg border border-black/8 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500 shadow-sm transition hover:text-zinc-900 group-hover:flex dark:border-white/10 dark:bg-white/8 dark:hover:text-zinc-100"
        >
          ✎ Edit
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-[11px] text-zinc-400">One item per line</p>
      <textarea
        autoFocus
        rows={Math.max(4, items.length + 1)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full resize-y rounded-xl border border-[#0f7b49]/40 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 outline-none ring-2 ring-[#0f7b49]/15 dark:border-[#0f7b49]/30 dark:bg-white/8 dark:text-zinc-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#0f7b49] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d6b3f] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="rounded-lg border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditableTags({
  tags,
  onSave,
  label,
  color = "green",
}: {
  tags: string[];
  onSave: (v: string[]) => Promise<void>;
  label: string;
  color?: "green" | "sky" | "violet" | "amber";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tags.join(", "));
  const [saving, setSaving] = useState(false);

  const colorMap: Record<string, string> = {
    green: "bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#4ade80]",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  async function save() {
    const parsed = draft.split(",").map((t) => t.trim()).filter(Boolean);
    setSaving(true);
    await onSave(parsed);
    setSaving(false);
    setEditing(false);
  }

  function cancel() { setDraft(tags.join(", ")); setEditing(false); }

  if (!editing) {
    return (
      <div className="group relative">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className={`rounded-full px-3 py-1 text-xs font-medium ${colorMap[color]}`}>{tag}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setDraft(tags.join(", ")); setEditing(true); }}
          aria-label={`Edit ${label}`}
          className="absolute right-0 top-0 hidden rounded-lg border border-black/8 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500 shadow-sm transition hover:text-zinc-900 group-hover:flex dark:border-white/10 dark:bg-white/8 dark:hover:text-zinc-100"
        >
          ✎ Edit
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-[11px] text-zinc-400">Comma-separated values</p>
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        className="w-full rounded-xl border border-[#0f7b49]/40 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-2 ring-[#0f7b49]/15 dark:border-[#0f7b49]/30 dark:bg-white/8 dark:text-zinc-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#0f7b49] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d6b3f] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="rounded-lg border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
        <div className="h-px flex-1 bg-black/6 dark:bg-white/8" />
      </div>
      {children}
    </div>
  );
}

function InfoCard({
  icon, label, value, color = "zinc", children
}: {
  icon: string; label: string; value?: string; color?: string; children?: React.ReactNode;
}) {
  const borderBg: Record<string, string> = {
    sky: "border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-900/20",
    violet: "border-violet-200 bg-violet-50 dark:border-violet-900/40 dark:bg-violet-900/20",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20",
    emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20",
    zinc: "border-black/8 bg-white dark:border-white/10 dark:bg-white/5",
  };
  const labelCls: Record<string, string> = {
    sky: "text-sky-700 dark:text-sky-400",
    violet: "text-violet-700 dark:text-violet-400",
    amber: "text-amber-700 dark:text-amber-400",
    emerald: "text-emerald-700 dark:text-emerald-400",
    zinc: "text-zinc-500 dark:text-zinc-400",
  };
  return (
    <div className={`rounded-xl border p-4 ${borderBg[color]}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${labelCls[color]}`}>{label}</p>
      </div>
      {children ?? <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{value}</p>}
    </div>
  );
}

export default function RunWorkspaceClient({ runId, run }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const initial = run.analysis?.analysis ?? null;
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(initial);

  const input = run.input ?? null;
  const blogSources = run.research?.blogs ?? [];
  const sitemapUrls = run.research?.sitemapUrls ?? [];
  const articlesCount = run.approvedArticles?.articles?.length ?? 0;
  const websiteUrl = input?.websiteUrl || "";
  const domain = getDomain(websiteUrl);
  const companyName =
    input?.companyName ||
    (domain ? domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Brand");
  const oneLiner = analysis?.companySummary
    ? analysis.companySummary.split(/[.!?]/)[0].trim()
    : null;

  async function saveAnalysisField(patch: Partial<BrandAnalysis>) {
    if (!analysis) return;
    const updated = { ...analysis, ...patch };
    setAnalysis(updated);
    setSaveError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "update-analysis", runId, analysis: updated })
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok || data.error) throw new Error(data.error || "Save failed.");
        router.refresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed.");
        setAnalysis(initial); // revert on error
      }
    });
  }

  return (
    <div className="px-6 py-6">

      {/* Brand header */}
      <div className="mb-6 flex flex-wrap items-start gap-5 rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <BrandLogo websiteUrl={websiteUrl} companyName={companyName} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{companyName}</h1>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-sm text-zinc-400 transition hover:text-[#0f7b49] dark:hover:text-[#4ade80]"
              >
                {domain}
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                </svg>
              </a>
              {oneLiner && <p className="mt-1.5 max-w-lg text-sm text-zinc-500 dark:text-zinc-400">{oneLiner}.</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-black/8 bg-zinc-50 px-4 py-2 text-center dark:border-white/10 dark:bg-white/5">
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{blogSources.length + sitemapUrls.length}</p>
                <p className="text-xs text-zinc-400">Pages scanned</p>
              </div>
              <div className="rounded-xl border border-black/8 bg-zinc-50 px-4 py-2 text-center dark:border-white/10 dark:bg-white/5">
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{articlesCount}</p>
                <p className="text-xs text-zinc-400">Articles</p>
              </div>
            </div>
          </div>

          {/* Workflow progress */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
              <span>Workflow progress</span>
              <span>{articlesCount > 0 ? "3/3" : analysis ? "1/3" : "0/3"} steps done</span>
            </div>
            <div className="flex gap-1">
              {[
                { label: "Analyzed", done: !!analysis },
                { label: "Topics", done: !!(run.topics?.topics?.length) },
                { label: "Articles", done: articlesCount > 0 }
              ].map(({ label, done }) => (
                <div key={label} className="flex-1">
                  <div className={`h-2 rounded-full ${done ? "bg-[#0f7b49]" : "bg-black/8 dark:bg-white/8"}`} />
                  <p className={`mt-1 text-center text-[10px] ${done ? "font-semibold text-[#0f7b49]" : "text-zinc-400"}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          {saveError}
        </div>
      )}

      {isPending && (
        <div className="mb-4 rounded-xl border border-[#0f7b49]/20 bg-[#0f7b49]/5 px-4 py-2.5 text-sm text-[#0f7b49] dark:border-[#0f7b49]/30 dark:bg-[#0f7b49]/10">
          Saving changes…
        </div>
      )}

      {!analysis && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/60 py-16 text-center dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 text-3xl">🔍</div>
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">No analysis yet</h2>
          <p className="mt-1 text-sm text-zinc-400">Go back and run an analysis for this brand.</p>
          <Link href="/" className="mt-4 rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]">
            Start analysis
          </Link>
        </div>
      )}

      {analysis && (
        <div className="grid gap-6">

          {/* Edit hint */}
          <div className="flex items-center gap-2 rounded-xl border border-black/6 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500 dark:border-white/8 dark:bg-white/3 dark:text-zinc-400">
            <span>✎</span>
            <span>Hover any section to reveal an <strong className="text-zinc-700 dark:text-zinc-300">Edit</strong> button — all fields are editable and auto-save.</span>
          </div>

          {/* Overview cards — 4 quick editable fields */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon="🎯" label="Audience" color="sky">
              <EditableText
                label="Audience"
                value={analysis.audience}
                multiline
                rows={3}
                onSave={(v) => saveAnalysisField({ audience: v })}
              />
            </InfoCard>
            <InfoCard icon="📖" label="Reading Level" color="violet">
              <EditableText
                label="Reading level"
                value={analysis.writingStyle.readingLevel}
                onSave={(v) => saveAnalysisField({ writingStyle: { ...analysis.writingStyle, readingLevel: v } })}
              />
            </InfoCard>
            <InfoCard icon="🎨" label="Tone" color="amber">
              <EditableText
                label="Tone"
                value={analysis.writingStyle.tone}
                onSave={(v) => saveAnalysisField({ writingStyle: { ...analysis.writingStyle, tone: v } })}
              />
            </InfoCard>
            <InfoCard icon="🏗️" label="Structure" color="emerald">
              <EditableText
                label="Structure"
                value={analysis.writingStyle.structure}
                onSave={(v) => saveAnalysisField({ writingStyle: { ...analysis.writingStyle, structure: v } })}
              />
            </InfoCard>
          </div>

          {/* Company Summary */}
          <Section title="Company Summary" icon="🏢">
            <div className="rounded-xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <EditableText
                label="Company summary"
                value={analysis.companySummary}
                multiline
                rows={4}
                onSave={(v) => saveAnalysisField({ companySummary: v })}
              />
              <div className="mt-4 border-t border-black/6 pt-4 dark:border-white/8">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Vision</p>
                <EditableText
                  label="Vision"
                  value={analysis.vision}
                  multiline
                  rows={2}
                  onSave={(v) => saveAnalysisField({ vision: v })}
                />
              </div>
            </div>
          </Section>

          {/* Products / Differentiators */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Products & Services" icon="📦">
              <div className="rounded-xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <EditableList
                  label="Products & Services"
                  items={analysis.productsOrServices}
                  bulletChar="✓"
                  onSave={(v) => saveAnalysisField({ productsOrServices: v })}
                />
              </div>
            </Section>
            <Section title="What Makes Them Different" icon="⚡">
              <div className="rounded-xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <EditableList
                  label="Differentiators"
                  items={analysis.differentiators}
                  bulletChar="★"
                  onSave={(v) => saveAnalysisField({ differentiators: v })}
                />
              </div>
            </Section>
          </div>

          {/* Brand Voice */}
          <Section title="Brand Voice" icon="🎙️">
            <div className="rounded-xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <EditableTags
                label="Brand voice"
                tags={analysis.brandVoice}
                color="green"
                onSave={(v) => saveAnalysisField({ brandVoice: v })}
              />
              {analysis.writingStyle.styleNotes.length > 0 && (
                <div className="mt-4 border-t border-black/6 pt-4 dark:border-white/8">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Style Notes</p>
                  <EditableList
                    label="Style notes"
                    items={analysis.writingStyle.styleNotes}
                    bulletChar="•"
                    onSave={(v) => saveAnalysisField({ writingStyle: { ...analysis.writingStyle, styleNotes: v } })}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* SEO Observations */}
          <Section title="SEO Observations" icon="🔍">
            <div className="rounded-xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <EditableTags
                label="SEO observations"
                tags={analysis.seoObservations}
                color="sky"
                onSave={(v) => saveAnalysisField({ seoObservations: v })}
              />
            </div>
          </Section>

          {/* Source coverage */}
          <Section title="Pages Scanned" icon="🌐">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-500">Blog pages</p>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-white/10">{blogSources.length}</span>
                </div>
                {blogSources.length === 0 ? <p className="text-xs text-zinc-400">None found</p> : (
                  <div className="max-h-40 overflow-y-auto">
                    {blogSources.slice(0, 8).map((page) => (
                      <div key={page.url} className="border-b border-black/4 py-2 last:border-0 dark:border-white/6">
                        <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">{page.title || page.url}</p>
                        <p className="truncate text-[10px] text-zinc-400">{page.url}</p>
                      </div>
                    ))}
                    {blogSources.length > 8 && <p className="mt-1 text-[10px] text-zinc-400">+{blogSources.length - 8} more</p>}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-500">Sitemap URLs</p>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-white/10">{sitemapUrls.length}</span>
                </div>
                {sitemapUrls.length === 0 ? <p className="text-xs text-zinc-400">No sitemap found</p> : (
                  <div className="max-h-40 overflow-y-auto">
                    {sitemapUrls.slice(0, 8).map((url) => (
                      <p key={url} className="truncate border-b border-black/4 py-2 text-[10px] text-zinc-500 last:border-0 dark:border-white/6 dark:text-zinc-400">{url}</p>
                    ))}
                    {sitemapUrls.length > 8 && <p className="mt-1 text-[10px] text-zinc-400">+{sitemapUrls.length - 8} more</p>}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Next step CTA */}
          <div className="rounded-2xl border border-[#0f7b49]/20 bg-[#0f7b49]/5 p-5 dark:border-[#0f7b49]/30 dark:bg-[#0f7b49]/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ready for the next step?</p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {run.topics?.topics?.length
                    ? `${run.topics.topics.length} topics already generated — pick one to create a blog post.`
                    : "Generate 10 SEO-targeted topic ideas based on this brand analysis."}
                </p>
              </div>
              <Link
                href={`/runs/${runId}/topics`}
                className="flex items-center gap-2 rounded-xl bg-[#0f7b49] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d6b3f]"
              >
                {run.topics?.topics?.length ? "View topics" : "Generate topics"}
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
