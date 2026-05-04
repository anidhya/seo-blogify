"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RunSummary, WorkflowProgress } from "@/lib/types";
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
  if (!res.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Workflow failed.");
  }
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
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white/80 text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
    >
      {resolvedTheme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M16.2 13.7A7.2 7.2 0 0 1 10.3 5a7.2 7.2 0 1 0 8.7 8.7 7.3 7.3 0 0 1-2.8 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function PathCard({
  title,
  description,
  href,
  accent,
  badge
}: {
  title: string;
  description: string;
  href: "/" | "/social";
  accent: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[18px] border border-black/[0.08] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-white/[0.08] dark:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent}`}>
          {badge}
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
          <path
            fillRule="evenodd"
            d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
    </Link>
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
      .then((next) => {
        if (active) setProfiles(next);
      })
      .catch(() => {
        if (active) setProfiles([]);
      })
      .finally(() => {
        if (active) setProfilesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function runAnalyze() {
    if (!form.websiteUrl.trim()) return;

    startTransition(async () => {
      let timer: ReturnType<typeof setInterval> | null = null;
      try {
        setError(null);
        setProgress({
          action: "analyze",
          percent: 8,
          stageLabel: "Starting analysis…",
          updatedAt: new Date().toISOString(),
          isComplete: false
        });
        timer = setInterval(() => {
          setProgress((current) => {
            if (!current || current.isComplete) return current;
            return {
              ...current,
              percent: Math.min(90, current.percent + 8),
              stageLabel:
                current.percent < 30
                  ? "Scanning website…"
                  : current.percent < 60
                    ? "Analyzing brand voice…"
                    : "Preparing workspace…",
              updatedAt: new Date().toISOString()
            };
          });
        }, 500);

        const payload = {
          websiteUrl: form.websiteUrl.trim(),
          companyName: form.companyName.trim(),
          vision: form.vision.trim(),
          keywords: form.keywords.trim(),
          blogUrls: form.blogUrls
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean)
        };
        const data = await postWorkflow("analyze", payload);
        if (timer) clearInterval(timer);
        setProgress({
          action: "analyze",
          percent: 100,
          stageLabel: "Done!",
          updatedAt: new Date().toISOString(),
          isComplete: true
        });
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
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7f4] dark:bg-[#0f1011]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[#0f7b49]/[0.08] blur-3xl dark:bg-[#4ade80]/10" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-violet-500/[0.08] blur-3xl dark:bg-violet-500/10" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f7b49,#111827)] shadow-sm">
              <span className="font-display text-sm font-bold text-white leading-none">M</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Marketier AI</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Brand workflow and social studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profiles"
              className="rounded-xl border border-black/[0.08] bg-white/80 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Dashboard
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 pt-8">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="grid gap-6">
              <div className="rounded-[28px] border border-black/[0.08] bg-white/[0.88] p-7 shadow-[0_18px_44px_rgba(15,23,42,0.05)] backdrop-blur dark:border-white/[0.08] dark:bg-white/5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7b49]/15 bg-[#0f7b49]/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f7b49] dark:text-[#86efac]">
                  One workspace, two paths
                </div>
                <h1 className="mt-5 max-w-2xl font-display text-4xl tracking-[-0.05em] text-zinc-950 sm:text-5xl dark:text-zinc-50">
                  Build the blog run or jump straight into Social Studio.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                  Start with a website URL when you want the full brand analysis and blog workflow. Use Social Studio when you need platform-ready posts for Instagram, LinkedIn, or X from a topic or source article.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <PathCard
                    href="/"
                    badge="Blog workflow"
                    title="Analyze a site and generate an approved article pipeline."
                    description="Best for brand analysis, topic discovery, drafting, revisions, and LinkedIn handoff."
                    accent="border-[#0f7b49]/20 bg-[#0f7b49]/10 text-[#0f7b49]"
                  />
                  <PathCard
                    href="/social"
                    badge="Social studio"
                    title="Turn one source into Instagram, LinkedIn, and X content."
                    description="Best for source-to-post generation, direct publish connections, comments, and scheduling."
                    accent="border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                  />
                </div>
              </div>

            </section>

            <section className="grid gap-4">
              <div className="rounded-[28px] border border-black/[0.08] bg-white/[0.92] p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)] backdrop-blur dark:border-white/[0.08] dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">Create project</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">Start a new run</h2>
                  </div>
                  <span className="rounded-full border border-black/[0.08] bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-400">
                    Blog first
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Website URL</span>
                    <input
                      type="url"
                      autoFocus
                      autoComplete="url"
                      placeholder="https://yourcompany.com"
                      value={form.websiteUrl}
                      onChange={(e) => update("websiteUrl", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && form.websiteUrl.trim() && !isPending) runAnalyze();
                      }}
                      className="rounded-xl border border-black/10 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/35 focus:bg-white focus:ring-2 focus:ring-[#0f7b49]/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:!bg-[#0f1115] dark:focus:border-[#4ade80]/30 dark:focus:ring-[#4ade80]/15"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {showAdvanced ? "Hide" : "Add"} details
                  </button>

                  {showAdvanced ? (
                    <div className="grid gap-3 rounded-[20px] border border-black/[0.06] bg-zinc-50/80 p-4 dark:border-white/[0.08] dark:bg-white/5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          placeholder="Company name"
                          value={form.companyName}
                          onChange={(e) => update("companyName", e.target.value)}
                          className="rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/35 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                        />
                        <input
                          placeholder="Priority keywords"
                          value={form.keywords}
                          onChange={(e) => update("keywords", e.target.value)}
                          className="rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/35 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                        />
                      </div>
                      <textarea
                        placeholder="Brand positioning notes"
                        value={form.vision}
                        onChange={(e) => update("vision", e.target.value)}
                        rows={2}
                        className="resize-none rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/35 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                      />
                      <textarea
                        placeholder={"Blog URLs, one per line\nhttps://yourcompany.com/blog/post-1"}
                        value={form.blogUrls}
                        onChange={(e) => update("blogUrls", e.target.value)}
                        rows={3}
                        className="resize-none rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#0f7b49]/35 focus:ring-1 focus:ring-[#0f7b49]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={runAnalyze}
                      disabled={!form.websiteUrl.trim() || isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-50"
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
                          Analyze brand
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path
                              fillRule="evenodd"
                              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                    <Link
                      href="/social"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 py-3.5 text-sm font-semibold text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 dark:text-violet-300"
                    >
                      Open Social Studio
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path
                          fillRule="evenodd"
                          d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Link>
                  </div>

                  {error ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </p>
                  ) : null}
                </div>
              </div>

              {progress ? (
                <div className="rounded-[20px] border border-black/[0.08] bg-white/[0.88] p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/5">
                  <WorkflowProgressBar progress={progress} label="Analyzing" variant="panel" />
                </div>
              ) : null}

            </section>
          </div>

          <div className="mt-6">
            <section className="rounded-[24px] border border-black/[0.08] bg-white/[0.88] p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Recent work</p>
                  <h2 className="mt-1 font-display text-2xl tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">Recent projects</h2>
                </div>
                <Link href="/profiles" className="text-sm font-medium text-[#0f7b49] hover:underline dark:text-[#4ade80]">
                  View all
                </Link>
              </div>

              {profilesLoading ? (
                <div className="mt-4 grid gap-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-[72px] animate-pulse rounded-[16px] bg-zinc-100 dark:bg-white/5" />
                  ))}
                </div>
              ) : recentProfiles.length === 0 ? (
                <div className="mt-4 rounded-[18px] border border-dashed border-black/10 p-8 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  No projects yet. Start with a website URL above or open Social Studio.
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {recentProfiles.map((profile) => (
                    <Link
                      key={profile.runId}
                      href={`/runs/${profile.runId}`}
                      className="group flex items-center gap-4 rounded-[16px] border border-black/[0.08] bg-zinc-50 px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#0f7b49]/20 hover:bg-white dark:border-white/[0.08] dark:bg-white/5 dark:hover:bg-white/[0.08]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f7b49,#111827)] text-sm font-bold text-white">
                        {(profile.companyName || profile.websiteUrl).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-950 transition group-hover:text-[#0f7b49] dark:text-zinc-100">
                          {profile.companyName || "Untitled brand"}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{profile.websiteUrl}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          profile.publishStatus === "publish_ready"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
                        }`}
                      >
                        {profile.publishStatus === "publish_ready" ? "Ready" : "Draft"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
