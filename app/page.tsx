"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { RunSummary, WorkflowProgress } from "@/lib/types";
import { useRouter } from "next/navigation";
import WorkflowProgressBar from "./components/workflow-progress";
import { useTheme } from "./components/theme-provider";

type WorkflowResponse = { runId: string } | { error: string };

const initialForm = { websiteUrl: "", companyName: "", keywords: "", vision: "", blogUrls: "" };

async function postWorkflow(step: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, payload })
  });
  const data = (await res.json()) as WorkflowResponse;
  if (!res.ok || "error" in data) throw new Error("error" in data ? data.error : "Workflow failed.");
  return data;
}

async function fetchProfiles() {
  const res = await fetch("/api/runs", { cache: "no-store" });
  const data = (await res.json()) as { profiles?: RunSummary[] };
  return data.profiles ?? [];
}

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/8 bg-white/80 text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
    >
      {resolvedTheme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M16.2 13.7A7.2 7.2 0 0 1 10.3 5a7.2 7.2 0 1 0 8.7 8.7 7.3 7.3 0 0 1-2.8 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [profiles, setProfiles] = useState<RunSummary[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);

  useEffect(() => {
    let active = true;
    fetchProfiles()
      .then((r) => { if (active) setProfiles(r); })
      .catch(() => { if (active) setProfiles([]); })
      .finally(() => { if (active) setProfilesLoading(false); });
    return () => { active = false; };
  }, []);

  function update(field: keyof typeof initialForm, value: string) {
    setForm((c) => ({ ...c, [field]: value }));
  }

  function runAnalyze() {
    if (!form.websiteUrl.trim()) return;
    startTransition(async () => {
      let timer: ReturnType<typeof setInterval> | null = null;
      try {
        setError(null);
        setProgress({ action: "analyze", percent: 5, stageLabel: "Starting…", updatedAt: new Date().toISOString(), isComplete: false });
        timer = setInterval(() => {
          setProgress((c) => {
            if (!c || c.isComplete) return c;
            return {
              ...c,
              percent: Math.min(90, c.percent + 7),
              stageLabel: c.percent < 25 ? "Scanning website…" : c.percent < 55 ? "Analyzing brand voice…" : "Preparing workspace…",
              updatedAt: new Date().toISOString()
            };
          });
        }, 500);
        const payload = {
          websiteUrl: form.websiteUrl.trim(),
          companyName: form.companyName.trim(),
          vision: form.vision.trim(),
          keywords: form.keywords.trim(),
          blogUrls: form.blogUrls.split("\n").map((v) => v.trim()).filter(Boolean)
        };
        const data = await postWorkflow("analyze", payload);
        if (timer) clearInterval(timer);
        setProgress({ action: "analyze", percent: 100, stageLabel: "Done!", updatedAt: new Date().toISOString(), isComplete: true });
        router.push(`/runs/${data.runId}`);
      } catch (err) {
        if (timer) clearInterval(timer);
        setProgress(null);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (timer) clearInterval(timer);
      }
    });
  }

  const recentProfiles = profiles.slice(0, 4);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f6f9f6] dark:bg-[#0f1011]">

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0f7b49,#111827)]">
            <span className="font-display text-xs font-bold text-white leading-none">M</span>
          </div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Marketier AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profiles"
            className="rounded-xl border border-black/8 bg-white/80 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Full-screen hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-xl">

          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0f7b49]" />
              Brand-aware blog workflow
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-3 text-center font-display text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-white">
            Create your<br />brand project
          </h1>
          <p className="mb-10 text-center text-base text-zinc-500 dark:text-zinc-400">
            Enter your website URL to analyze brand voice, discover content gaps,<br className="hidden sm:block" />
            and generate publish-ready blog drafts.
          </p>

          {/* Project creator card */}
          <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a1b1f]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">New project</p>

            {/* URL */}
            <div className="mb-3">
              <input
                type="url"
                autoFocus
                autoComplete="url"
                placeholder="https://yourcompany.com"
                value={form.websiteUrl}
                onChange={(e) => update("websiteUrl", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && form.websiteUrl.trim() && !isPending) runAnalyze(); }}
                className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3.5 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/40 focus:bg-white focus:ring-2 focus:ring-[#0f7b49]/12 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:bg-white/8"
              />
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="mb-3 flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
              {showAdvanced ? "Hide" : "Add"} details
              <span className="text-xs text-zinc-300 dark:text-zinc-600">company name · keywords · blog URLs</span>
            </button>

            {showAdvanced && (
              <div className="mb-3 grid gap-2.5 rounded-xl border border-black/6 bg-zinc-50/80 p-4 dark:border-white/8 dark:bg-white/3">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    placeholder="Company name"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className="rounded-lg border border-black/8 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/40 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                  />
                  <input
                    placeholder="Priority keywords"
                    value={form.keywords}
                    onChange={(e) => update("keywords", e.target.value)}
                    className="rounded-lg border border-black/8 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/40 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                  />
                </div>
                <textarea
                  placeholder="Brand positioning notes (optional)"
                  value={form.vision}
                  onChange={(e) => update("vision", e.target.value)}
                  rows={2}
                  className="resize-none rounded-lg border border-black/8 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/40 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                />
                <textarea
                  placeholder={"Blog URLs, one per line\nhttps://yourcompany.com/blog/post-1"}
                  value={form.blogUrls}
                  onChange={(e) => update("blogUrls", e.target.value)}
                  rows={3}
                  className="resize-none rounded-lg border border-black/8 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/40 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                />
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={runAnalyze}
              disabled={!form.websiteUrl.trim() || isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#1e293b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>
                  Analyze Brand & Create Project
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </button>

            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Progress */}
          {progress && (
            <div className="mt-4">
              <WorkflowProgressBar progress={progress} label="Analyzing" variant="panel" />
            </div>
          )}

          {/* Steps */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { n: "1", title: "Analyze", desc: "Scans your site & understands brand voice" },
              { n: "2", title: "Pick topics", desc: "Choose from 10 SEO-optimized topic ideas" },
              { n: "3", title: "Publish", desc: "Get a quality-checked, ready blog draft" }
            ].map(({ n, title, desc }) => (
              <div key={n} className="rounded-xl border border-black/6 bg-white/60 p-4 text-center dark:border-white/8 dark:bg-white/3">
                <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0f7b49]/12 text-xs font-bold text-[#0f7b49]">{n}</div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>

          {/* Recent projects */}
          {!profilesLoading && recentProfiles.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Recent projects</p>
                <Link href="/profiles" className="text-xs font-medium text-[#0f7b49] hover:underline dark:text-[#4ade80]">
                  View all ({profiles.length}) →
                </Link>
              </div>
              <div className="grid gap-2">
                {recentProfiles.map((p) => (
                  <Link
                    key={p.runId}
                    href={`/runs/${p.runId}`}
                    className="flex items-center gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 transition hover:border-[#0f7b49]/30 hover:shadow-sm dark:border-white/8 dark:bg-white/5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                      {(p.companyName || p.websiteUrl).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">{p.companyName || "Untitled brand"}</p>
                      <p className="truncate text-xs text-zinc-400">{p.websiteUrl}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      p.publishStatus === "publish_ready"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-zinc-400"
                    }`}>
                      {p.publishStatus === "publish_ready" ? "Ready" : "Draft"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
