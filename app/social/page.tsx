"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/app/components/workspace-shell";
import type { SocialProjectSummary } from "@/lib/types";

type CreateResponse = { projectId: string } | { error: string };

async function fetchProjects() {
  const response = await fetch("/api/social", { cache: "no-store" });
  const data = (await response.json()) as { projects?: SocialProjectSummary[] };
  return data.projects ?? [];
}

async function createProject(payload: Record<string, unknown>) {
  const response = await fetch("/api/social", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = (await response.json()) as CreateResponse;
  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Unable to create social project.");
  }
  return data;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SocialHomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<SocialProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceMode, setSourceMode] = useState<"manual" | "url">("manual");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((next) => {
        if (active) setProjects(next);
      })
      .catch(() => {
        if (active) setProjects([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const payload =
          sourceMode === "url"
            ? {
                source: {
                  mode: "url",
                  url: url.trim(),
                  topic: topic.trim(),
                  audience: audience.trim(),
                  notes: notes.trim()
                }
              }
            : {
                source: {
                  mode: "manual",
                  topic: topic.trim(),
                  audience: audience.trim(),
                  notes: notes.trim()
                }
              };

        const data = await createProject(payload);
        router.push(`/social/${data.projectId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create social project.");
      }
    });
  }

  const recentProjects = projects.slice(0, 6);

  return (
    <WorkspaceShell
      title="Social Studio"
      subtitle="Research once and generate platform-native content for Instagram, LinkedIn, and X."
      navItems={[
        { label: "Social Studio", href: "/social", icon: "social", active: true },
        { label: "Blog workflow", href: "/", icon: "sync" },
        { label: "Dashboard", href: "/profiles", icon: "articles" }
      ]}
    >
      <section className="grid gap-5 px-6 py-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
          <div className="rounded-[16px] border border-black/[0.08] bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
              Social content gateway
            </div>
            <h1 className="mt-4 font-display text-3xl tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
              Turn one source into three platform-ready content streams.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Start from a blog/article URL or a manually entered topic. The studio researches the source, then builds editable drafts for Instagram, LinkedIn, and X with single-post and native long-form variants.
            </p>
          </div>

          <div className="rounded-[16px] border border-black/[0.08] bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSourceMode("manual")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  sourceMode === "manual"
                    ? "bg-[#0f172a] text-white"
                    : "border border-black/[0.08] bg-white text-zinc-600 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-300"
                }`}
              >
                Manual topic
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("url")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  sourceMode === "url"
                    ? "bg-[#0f172a] text-white"
                    : "border border-black/[0.08] bg-white text-zinc-600 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-300"
                }`}
              >
                Blog / article URL
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {sourceMode === "url" ? "Article URL" : "Topic"}
                </span>
                {sourceMode === "url" ? (
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com/article"
                    className="rounded-xl border border-black/[0.08] bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:bg-white focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100"
                  />
                ) : (
                  <input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="What should the content be about?"
                    className="rounded-xl border border-black/[0.08] bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:bg-white focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100"
                  />
                )}
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Audience</span>
                <input
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="Optional audience context"
                  className="rounded-xl border border-black/[0.08] bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:bg-white focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Positioning, angle, claims to avoid, CTA, or brand voice notes."
                  className="resize-none rounded-xl border border-black/[0.08] bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:bg-white focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100"
                />
              </label>

              {sourceMode === "url" ? (
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Fallback topic</span>
                  <input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Optional title hint for the generated pack"
                    className="rounded-xl border border-black/[0.08] bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#0f172a]/30 focus:bg-white focus:ring-2 focus:ring-[#0f172a]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-100"
                  />
                </label>
              ) : null}

              <button
                type="button"
                onClick={submit}
                disabled={isPending || (sourceMode === "url" ? !url.trim() : !topic.trim())}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Creating…" : "Generate social pack"}
              </button>
            </div>

            {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">{error}</p> : null}
          </div>
        </div>

        <div className="rounded-[16px] border border-black/[0.08] bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Library</p>
              <h2 className="mt-1 font-display text-2xl tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">Recent social projects</h2>
            </div>
            <div className="flex gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold dark:bg-white/[0.08]">{projects.length} total</span>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-[14px] bg-zinc-100 dark:bg-white/5" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
                <div className="mt-4 rounded-[14px] border border-dashed border-black/[0.08] p-8 text-center text-sm text-zinc-500 dark:border-white/[0.08] dark:text-zinc-400">
                  No social projects yet. Create one above or seed it from an approved blog article.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.projectId}
                      href={`/social/${project.projectId}`}
                      className="group rounded-[14px] border border-black/[0.08] bg-zinc-50 p-4 transition hover:-translate-y-0.5 hover:border-violet-500/20 hover:bg-white hover:shadow-sm dark:border-white/[0.08] dark:bg-white/5 dark:hover:bg-white/[0.08]"
                    >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950 transition group-hover:text-violet-700 dark:text-zinc-100 dark:group-hover:text-violet-300">
                        {project.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{project.sourceLabel}</p>
                    </div>
                    <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
                      {project.sourceMode}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="rounded-full bg-white px-2.5 py-1 dark:bg-white/5">{project.platformCount} platforms</span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">{project.readyCount} ready</span>
                    <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">{project.scheduledCount} scheduled</span>
                  </div>
                  <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">Updated {timeAgo(project.updatedAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </WorkspaceShell>
  );
}
