"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { RunSummary, WorkflowProgress } from "@/lib/types";
import { useRouter } from "next/navigation";
import WorkflowProgressBar from "./components/workflow-progress";
import WorkspaceShell from "./components/workspace-shell";

type WorkflowResponse = { runId: string } | { error: string };

const initialForm = {
  websiteUrl: "",
  companyName: "",
  vision: "",
  keywords: "",
  blogUrls: ""
};

async function postWorkflow(step: string, payload: Record<string, unknown>) {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ step, payload })
  });

  const data = (await response.json()) as WorkflowResponse;

  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Workflow request failed.");
  }

  return data;
}

async function fetchProfileSummaries() {
  const response = await fetch("/api/runs", { cache: "no-store" });
  const data = (await response.json()) as { profiles?: RunSummary[] };
  return data.profiles ?? [];
}

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [profiles, setProfiles] = useState<RunSummary[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [status, setStatus] = useState("Add a website and blog URLs to start a new sync.");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [analyzeProgress, setAnalyzeProgress] = useState<WorkflowProgress | null>(null);
  const totalProfiles = profiles.length;
  const publishReadyProfiles = profiles.filter((profile) => profile.publishStatus === "publish_ready").length;
  const latestProfile = profiles[0] ?? null;

  const blogUrlList = form.blogUrls
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  const payload = {
    websiteUrl: form.websiteUrl.trim(),
    companyName: form.companyName.trim(),
    vision: form.vision.trim(),
    keywords: form.keywords.trim(),
    blogUrls: blogUrlList
  };

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      try {
        const result = await fetchProfileSummaries();
        if (active) {
          setProfiles(result);
        }
      } catch {
        if (active) {
          setProfiles([]);
        }
      } finally {
        if (active) {
          setProfilesLoading(false);
        }
      }
    }

    loadProfiles();

    return () => {
      active = false;
    };
  }, []);

  function runAnalyze() {
    startTransition(async () => {
      let timer: ReturnType<typeof setInterval> | null = null;
      try {
        setError(null);
        setStatus("Analyzing the website, company positioning, and blog voice…");
        setAnalyzeProgress({
          action: "analyze",
          percent: 4,
          stageLabel: "Starting analysis",
          updatedAt: new Date().toISOString(),
          isComplete: false
        });

        timer = setInterval(() => {
          setAnalyzeProgress((current) => {
            if (!current || current.isComplete) {
              return current;
            }

            return {
              ...current,
              percent: Math.min(90, current.percent + 8),
              stageLabel:
                current.percent < 20
                  ? "Scanning website and blog URLs"
                  : current.percent < 50
                    ? "Analyzing brand voice and content gaps"
                    : "Preparing draft workspace",
              updatedAt: new Date().toISOString()
            };
          });
        }, 450);

        const data = await postWorkflow("analyze", payload);
      if (timer) {
        clearInterval(timer);
      }
        setAnalyzeProgress({
          action: "analyze",
          percent: 100,
          stageLabel: "Analysis complete",
          updatedAt: new Date().toISOString(),
          isComplete: true
        });
        setStatus(`Analysis complete. Opening the workspace for run ${data.runId}…`);
        router.push(`/runs/${data.runId}`);
      } catch (caughtError) {
        if (timer) {
          clearInterval(timer);
        }
        setAnalyzeProgress(null);
        const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setError(message);
        setStatus("Analysis failed.");
      } finally {
        if (timer) {
          clearInterval(timer);
        }
      }
    });
  }

  return (
    <WorkspaceShell
      title="Marketier AI 0.1"
      subtitle="Compact brand-sync dashboard for blog workflows."
      navItems={[
        { label: "Sync", href: "/", icon: "sync", active: true },
        { label: "Profiles", href: "/profiles", icon: "articles" },
        { label: "FAQ", href: "/faq", icon: "publish" }
      ]}
    >
      <section className="grid gap-4">
        <div id="brand-sync" className="surface-shell scroll-mt-24 p-3">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4">
              <div className="flex flex-col gap-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-600 backdrop-blur dark:bg-white/5 dark:text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0f7b49]" />
                  Marketier AI 0.1
                </div>
                <h1 className="max-w-2xl font-display text-3xl tracking-[-0.04em] text-zinc-900 md:text-[2.45rem] dark:text-zinc-50">
                  Publish articles that actually sound on-brand
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-600 md:text-[15px] dark:text-zinc-300">
                  Scan a site, find the content gaps, approve topics, and generate a blog draft that fits the company voice.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#0f7b49)] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 disabled:cursor-progress disabled:opacity-60"
                  type="button"
                  disabled={isPending}
                  onClick={runAnalyze}
                >
                  {isPending ? "Analyzing…" : "Analyze Brand"}
                </button>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
                  href="/profiles"
                >
                  View profiles
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
                  href="/faq"
                >
                  FAQ
                </Link>
              </div>

              <div className="overflow-hidden rounded-[12px] border border-white/10 bg-white/85 shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:bg-white/5">
                <div className="grid gap-px sm:grid-cols-3">
                  <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,251,249,0.96))] p-4 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(15,17,21,0.92))]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#0f7b49] dark:text-zinc-400">Workflow</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Scan → Approve → Draft</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Brand sync stays the primary action.</p>
                  </div>
                  <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,247,0.96))] p-4 sm:border-x sm:border-black/5 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(15,17,21,0.92))]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#0f7b49] dark:text-zinc-400">Quality gate</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">80% minimum pass</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Weak drafts rewrite automatically.</p>
                  </div>
                  <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,244,0.96))] p-4 sm:border-l sm:border-black/5 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(15,17,21,0.92))]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#0f7b49] dark:text-zinc-400">Saved work</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {profilesLoading ? "Loading…" : `${totalProfiles} synced profiles`}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {profilesLoading
                      ? "Fetching saved workspace summaries."
                      : `${publishReadyProfiles} ready to publish${latestProfile ? `, latest: ${latestProfile.companyName}` : "."}`}
                  </p>
                </div>
              </div>
            </div>
            </div>

            <div className="surface-card grid gap-4 rounded-[12px] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Sync brand</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50">Start a new run</h2>
                </div>
                <span className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-[11px] font-semibold text-[#0f7b49] dark:text-[#86efac]">
                  Action first
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200" htmlFor="websiteUrl">
                    Website URL
                  </label>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/50 focus:ring-2 focus:ring-[#0f7b49]/15 dark:bg-white/5 dark:text-zinc-100"
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    autoComplete="url"
                    placeholder="https://company.com…"
                    value={form.websiteUrl}
                    onChange={(event) => updateField("websiteUrl", event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200" htmlFor="companyName">
                    Company Name
                  </label>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/50 focus:ring-2 focus:ring-[#0f7b49]/15 dark:bg-white/5 dark:text-zinc-100"
                    id="companyName"
                    name="companyName"
                    autoComplete="organization"
                    placeholder="Acme Labs…"
                    value={form.companyName}
                    onChange={(event) => updateField("companyName", event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200" htmlFor="keywords">
                    Priority keywords
                  </label>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/50 focus:ring-2 focus:ring-[#0f7b49]/15 dark:bg-white/5 dark:text-zinc-100"
                    id="keywords"
                    name="keywords"
                    autoComplete="off"
                    placeholder="ai marketing automation…"
                    value={form.keywords}
                    onChange={(event) => updateField("keywords", event.target.value)}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200" htmlFor="vision">
                    Vision or positioning notes
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/50 focus:ring-2 focus:ring-[#0f7b49]/15 dark:bg-white/5 dark:text-zinc-100"
                    id="vision"
                    name="vision"
                    autoComplete="off"
                    placeholder="What the company stands for, who it serves, what it wants to be known for…"
                    value={form.vision}
                    onChange={(event) => updateField("vision", event.target.value)}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200" htmlFor="blogUrls">
                    Blog URLs, one per line
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/50 focus:ring-2 focus:ring-[#0f7b49]/15 dark:bg-white/5 dark:text-zinc-100"
                    id="blogUrls"
                    name="blogUrls"
                    autoComplete="off"
                    placeholder={"https://company.com/blog/post-1…\nhttps://company.com/blog/post-2…"}
                    value={form.blogUrls}
                    onChange={(event) => updateField("blogUrls", event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {analyzeProgress ? <WorkflowProgressBar progress={analyzeProgress} label="Analyzing" variant="top" /> : null}

        <div
          className={`rounded-[12px] border px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${error ? "border-red-500/20 bg-red-500/10 text-red-200" : "border-black/10 bg-white/85 text-zinc-700 dark:bg-white/5 dark:text-zinc-200"}`}
          aria-live="polite"
        >
            <strong className="block text-sm">Status</strong>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{error ?? status}</p>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
