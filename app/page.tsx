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

function ProfileSkeleton() {
  return (
    <article className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[0_20px_60px_rgba(98,69,39,0.12)]">
      <div className="animate-pulse space-y-3" aria-hidden="true">
        <div className="h-10 w-2/3 rounded-full bg-black/5" />
        <div className="h-5 w-1/2 rounded-full bg-black/5" />
        <div className="grid gap-2">
          <div className="h-4 w-full rounded-full bg-black/5" />
          <div className="h-4 w-5/6 rounded-full bg-black/5" />
          <div className="h-4 w-2/5 rounded-full bg-black/5" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-full bg-black/5" />
          <div className="h-10 w-28 rounded-full bg-black/5" />
        </div>
      </div>
    </article>
  );
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

  async function refreshProfiles() {
    try {
      setProfiles(await fetchProfileSummaries());
    } catch {
      setProfiles([]);
    }
  }

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
        await refreshProfiles();
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
      title="Brand Sync"
      subtitle="Scan a site, approve topics, and open an approved article workflow."
      navItems={[
        { label: "Sync", href: "#brand-sync", icon: "sync", active: true },
        { label: "Process", href: "#how-it-works", icon: "analysis" },
        { label: "Profiles", href: "#synced-profiles", icon: "articles" },
        { label: "FAQ", href: "#faq", icon: "publish" }
      ]}
    >
      <section className="grid gap-4">
        <div id="brand-sync" className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-5 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur scroll-mt-24">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm text-neutral-600 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c35d2e]" />
              Brand-aware AI blog pipeline
            </div>
            <h1 className="font-serif text-4xl tracking-[-0.04em] text-neutral-900 md:text-5xl">
              Publish articles that actually sound on-brand
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-neutral-600 md:text-base">
              Scan a site, find the content gaps, approve topics, and generate a blog draft that fits the company voice.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Workflow</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">Scan → Approve → Draft</p>
              <p className="mt-1 text-sm text-neutral-600">One guided path with no extra setup.</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Quality gate</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">80% minimum pass</p>
              <p className="mt-1 text-sm text-neutral-600">Drafts rewrite automatically if they feel synthetic.</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Saved work</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">{totalProfiles} synced profiles</p>
              <p className="mt-1 text-sm text-neutral-600">
                {publishReadyProfiles} ready to publish{latestProfile ? `, latest: ${latestProfile.companyName}` : "."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Avg time to draft</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">&lt; 5 min</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Topics per run</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">10 fresh ideas</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Output</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">Blog + SEO meta + FAQs</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-neutral-800" htmlFor="websiteUrl">
                Website URL
              </label>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-neutral-900 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
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
              <label className="text-sm font-semibold text-neutral-800" htmlFor="companyName">
                Company Name
              </label>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-neutral-900 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
                id="companyName"
                name="companyName"
                autoComplete="organization"
                placeholder="Acme Labs…"
                value={form.companyName}
                onChange={(event) => updateField("companyName", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-neutral-800" htmlFor="vision">
                Vision or positioning notes
              </label>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-neutral-900 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
                id="vision"
                name="vision"
                autoComplete="off"
                placeholder="What the company stands for, who it serves, what it wants to be known for…"
                value={form.vision}
                onChange={(event) => updateField("vision", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-neutral-800" htmlFor="keywords">
                Priority keywords
              </label>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-neutral-900 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
                id="keywords"
                name="keywords"
                autoComplete="off"
                placeholder="ai marketing automation, lead gen workflows, startup content seo…"
                value={form.keywords}
                onChange={(event) => updateField("keywords", event.target.value)}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-neutral-800" htmlFor="blogUrls">
                Blog URLs, one per line
              </label>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-neutral-900 outline-none transition focus:border-[#c35d2e] focus:ring-2 focus:ring-[#c35d2e]/20"
                id="blogUrls"
                name="blogUrls"
                autoComplete="off"
                placeholder={"https://company.com/blog/post-1…\nhttps://company.com/blog/post-2…"}
                value={form.blogUrls}
                onChange={(event) => updateField("blogUrls", event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[#c35d2e] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b65228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/30 disabled:cursor-progress disabled:opacity-60"
              type="button"
              disabled={isPending}
              onClick={runAnalyze}
            >
              {isPending ? "Analyzing…" : "Analyze Brand"}
            </button>
          </div>

          {analyzeProgress ? (
            <WorkflowProgressBar progress={analyzeProgress} label="Analyzing" variant="top" />
          ) : null}

          <div
            className={`mt-5 rounded-2xl border px-4 py-3 ${error ? "border-red-200 bg-red-50" : "border-[#c35d2e]/15 bg-[#fff8ef]"}`}
            aria-live="polite"
          >
            <strong className="block text-sm">Status</strong>
            <p className="mt-1 text-sm text-neutral-600">{error ?? status}</p>
          </div>
        </div>

        <section id="how-it-works" className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-5 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur scroll-mt-24">
          <div className="flex items-end justify-between gap-4 max-md:flex-col">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">How it works</h2>
              <p className="text-sm text-neutral-600">A three-step flow that keeps the product easy to understand.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Discover",
                description: "Enter a site and supporting blog URLs. We scan the brand and extract current coverage."
              },
              {
                step: "02",
                title: "Approve",
                description: "Review the topic queue, approve the best angle, and add editorial comments if needed."
              },
              {
                step: "03",
                title: "Publish",
                description: "Generate the final draft with SEO meta, takeaways, and FAQs, then open the preview."
              }
            ].map((item) => (
              <article className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4" key={item.step}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{item.step}</p>
                <h3 className="mt-2 text-lg font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="synced-profiles" className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-5 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">Synced Profiles</h2>
              <p className="text-sm text-neutral-600">Previously synchronized brands and company profiles.</p>
            </div>
          </div>

          {profilesLoading ? (
            <div className="mt-4 grid gap-4">
              <ProfileSkeleton />
              <ProfileSkeleton />
              <ProfileSkeleton />
            </div>
          ) : profiles.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600">No synced profiles yet.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {profiles.map((profile) => (
                <article
                  className="rounded-3xl border border-black/10 bg-[#fffaf2] p-4 shadow-[0_16px_40px_rgba(98,69,39,0.12)]"
                  key={profile.runId}
                >
                  <Link
                    className="block transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25"
                    href={`/runs/${profile.runId}`}
                  >
                    <div className="flex items-start justify-between gap-4 max-md:flex-col">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-neutral-900">{profile.companyName}</h3>
                        <p className="mt-1 break-words text-sm text-neutral-600">{profile.websiteUrl}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          profile.publishStatus === "publish_ready"
                            ? "bg-emerald-100 text-emerald-700"
                            : profile.publishStatus === "needs_review"
                              ? "bg-neutral-100 text-neutral-600"
                              : "bg-[#f2d1c3] text-[#7e3614]"
                        }`}
                      >
                        {profile.publishStatus ?? profile.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-neutral-600">
                      <span>Updated {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "n/a"}</span>
                      <span>Quality {profile.qualityScore ?? "n/a"}</span>
                      <span>{profile.blogTitle ?? "No blog yet"}</span>
                      {profile.progressPercent !== null ? (
                        <span>
                          Progress {profile.progressPercent}%{profile.progressLabel ? ` • ${profile.progressLabel}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </Link>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm text-neutral-800"
                      href={`/runs/${profile.runId}`}
                    >
                      Open workspace
                    </Link>
                    {profile.hasBlog && profile.blogSlug ? (
                      <Link
                        className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm text-neutral-800"
                        href={`/runs/${profile.runId}/blog/${profile.blogSlug}`}
                        target="_blank"
                      >
                        Open preview
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="faq" className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-5 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur scroll-mt-24">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">FAQ</h2>
            <p className="text-sm text-neutral-600">Common questions before the first sync.</p>
          </div>

          <div className="mt-4 grid gap-3">
            {[
              {
                question: "Do I need to log in before using the app?",
                answer: "Not yet. The current flow is designed for fast content generation without account setup."
              },
              {
                question: "Does the app generate one blog or a content batch?",
                answer: "The current workflow generates one approved blog at a time, with a 10-topic approval queue before drafting."
              },
              {
                question: "What happens if the draft feels too AI-like?",
                answer: "The quality gate rewrites weak drafts until they pass the threshold or are marked for review."
              }
            ].map((item) => (
              <details className="group rounded-3xl border border-black/10 bg-[#fffaf2] p-4" key={item.question}>
                <summary className="cursor-pointer list-none text-sm font-semibold text-neutral-900">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </section>
    </WorkspaceShell>
  );
}
