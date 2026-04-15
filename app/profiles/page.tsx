"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RunSummary } from "@/lib/types";
import WorkspaceShell from "../components/workspace-shell";

async function fetchProfileSummaries() {
  const res = await fetch("/api/runs", { cache: "no-store" });
  const data = (await res.json()) as { profiles?: RunSummary[] };
  return data.profiles ?? [];
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url || "Unknown"; }
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }: { status?: string | null }) {
  if (status === "publish_ready") return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      Ready
    </span>
  );
  if (status === "needs_review") return (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Review
    </span>
  );
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
      Draft
    </span>
  );
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProfileSummaries()
      .then((r) => { if (active) setProfiles(r); })
      .catch(() => { if (active) setError("Unable to load profiles."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function deleteProfile(runId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      setDeletingId(runId);
      const res = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setProfiles(await fetchProfileSummaries());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  // Group profiles by domain
  const groups: Record<string, RunSummary[]> = {};
  for (const p of profiles) {
    const domain = getDomain(p.websiteUrl);
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(p);
  }
  const sortedDomains = Object.keys(groups).sort();

  const totalReady = profiles.filter((p) => p.publishStatus === "publish_ready").length;

  return (
    <WorkspaceShell
      title="Dashboard"
      navItems={[
        { label: "New project", href: "/", icon: "sync" },
        { label: "Dashboard", href: "/profiles", icon: "articles", active: true },
        { label: "FAQ", href: "/faq", icon: "publish" }
      ]}
    >
      <div className="px-6 py-6">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">All your brand projects, grouped by website.</p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <>
                <div className="rounded-xl border border-black/8 bg-white px-4 py-2 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{profiles.length}</p>
                  <p className="text-xs text-zinc-400">Total runs</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center dark:border-emerald-900/40 dark:bg-emerald-900/20">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{totalReady}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Ready</p>
                </div>
              </>
            )}
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New project
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-3 h-4 w-36 rounded-full bg-black/6 dark:bg-white/8" />
                <div className="grid gap-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-16 rounded-xl bg-black/4 dark:bg-white/5" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && profiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/8 bg-white dark:border-white/10 dark:bg-white/5">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-zinc-300 dark:text-zinc-600">
                <path d="M7 4h10l3 3v13H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M14 4v4h4M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">No projects yet</p>
            <p className="mt-1 text-sm text-zinc-400">Create your first project to get started.</p>
            <Link
              href="/"
              className="mt-4 rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
            >
              Create a project
            </Link>
          </div>
        )}

        {/* Grouped profiles */}
        {!loading && sortedDomains.length > 0 && (
          <div className="grid gap-8">
            {sortedDomains.map((domain) => {
              const runs = groups[domain];
              const domainReady = runs.filter((r) => r.publishStatus === "publish_ready").length;
              return (
                <div key={domain}>
                  {/* Domain header */}
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                      {domain.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{domain}</h2>
                      <span className="text-xs text-zinc-400">{runs.length} run{runs.length !== 1 ? "s" : ""}</span>
                      {domainReady > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {domainReady} ready
                        </span>
                      )}
                    </div>
                    <div className="h-px flex-1 bg-black/6 dark:bg-white/8" />
                  </div>

                  {/* Run cards */}
                  <div className="grid gap-2">
                    {runs.map((profile) => (
                      <article
                        key={profile.runId}
                        className="group flex items-center gap-4 rounded-xl border border-black/8 bg-white p-4 transition hover:border-[#0f7b49]/25 hover:shadow-sm dark:border-white/8 dark:bg-white/4 dark:hover:border-[#0f7b49]/25"
                      >
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0f7b49,#111827)] text-sm font-bold text-white">
                          {(profile.companyName || domain).slice(0, 1).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/runs/${profile.runId}`}
                              className="text-sm font-semibold text-zinc-900 transition hover:text-[#0f7b49] dark:text-zinc-100 dark:hover:text-[#4ade80]"
                            >
                              {profile.companyName || "Untitled brand"}
                            </Link>
                            <StatusBadge status={profile.publishStatus} />
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            <span>{timeAgo(profile.updatedAt)}</span>
                            {profile.qualityScore != null && (
                              <>
                                <span className="text-zinc-200 dark:text-zinc-700">·</span>
                                <span>Quality {profile.qualityScore}%</span>
                              </>
                            )}
                            {profile.blogTitle && (
                              <>
                                <span className="text-zinc-200 dark:text-zinc-700">·</span>
                                <span className="max-w-[200px] truncate">{profile.blogTitle}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2 opacity-0 transition group-hover:opacity-100">
                          <Link
                            href={`/runs/${profile.runId}`}
                            className="rounded-lg border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-[#0f7b49]/30 hover:text-[#0f7b49] dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                          >
                            Open
                          </Link>
                          {profile.hasBlog && profile.blogSlug && (
                            <Link
                              href={`/runs/${profile.runId}/blog/${profile.blogSlug}`}
                              target="_blank"
                              className="rounded-lg border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-[#0f7b49]/30 hover:text-[#0f7b49] dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                            >
                              Preview
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteProfile(profile.runId, profile.companyName || domain)}
                            disabled={deletingId === profile.runId}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            {deletingId === profile.runId ? "…" : "Delete"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
