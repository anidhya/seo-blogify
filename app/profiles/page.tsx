"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RunSummary } from "@/lib/types";
import WorkspaceShell from "../components/workspace-shell";

async function fetchProfileSummaries() {
  const response = await fetch("/api/runs", { cache: "no-store" });
  const data = (await response.json()) as { profiles?: RunSummary[] };
  return data.profiles ?? [];
}

function ProfileSkeleton() {
  return (
    <article className="rounded-[12px] border border-black/10 bg-white/94 p-4 shadow-[0_6px_14px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-white/5">
      <div className="animate-pulse space-y-3" aria-hidden="true">
        <div className="h-5 w-1/3 rounded-full bg-black/5 dark:bg-white/10" />
        <div className="h-4 w-1/2 rounded-full bg-black/5 dark:bg-white/10" />
        <div className="grid gap-2">
          <div className="h-4 w-full rounded-full bg-black/5 dark:bg-white/10" />
          <div className="h-4 w-5/6 rounded-full bg-black/5 dark:bg-white/10" />
        </div>
      </div>
    </article>
  );
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      try {
        setError(null);
        const result = await fetchProfileSummaries();
        if (active) {
          setProfiles(result);
        }
      } catch {
        if (active) {
          setProfiles([]);
          setError("Unable to load synced profiles.");
        }
      } finally {
        if (active) {
          setLoading(false);
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

  async function deleteProfile(runId: string, companyName: string) {
    const confirmed = window.confirm(
      `Delete "${companyName}" and all saved workflow data permanently? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setDeletingRunId(runId);
      const response = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to delete synced profile.");
      }

      await refreshProfiles();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setDeletingRunId(null);
    }
  }

  const totalProfiles = profiles.length;
  const publishReadyProfiles = profiles.filter((profile) => profile.publishStatus === "publish_ready").length;

  return (
    <WorkspaceShell
      title="Marketier AI 0.1"
      subtitle="All synced brands and workspace profiles."
      backHref="/"
      backLabel="Home"
      breadcrumbs={[
        { label: "Sync", href: "/" },
        { label: "Profiles", active: true }
      ]}
      topAction={null}
      navItems={[
        { label: "Sync", href: "/", icon: "sync" },
        { label: "Profiles", href: "/profiles", icon: "articles", active: true },
        { label: "FAQ", href: "/faq", icon: "publish" }
      ]}
    >
      <section className="grid gap-4">
        <div className="surface-shell grid gap-4 p-4 lg:p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Synced profiles</p>
              <h1 className="mt-1 font-display text-3xl tracking-[-0.04em] text-zinc-900 dark:text-zinc-50">Manage saved brands</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
                Open a workspace, preview the output, or delete a profile permanently.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
                {loading ? "Loading…" : `${totalProfiles} total`}
              </span>
              <span className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-xs font-semibold text-[#0f7b49] dark:text-[#86efac]">
                {loading ? "Loading…" : `${publishReadyProfiles} publish-ready`}
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-3">
            <ProfileSkeleton />
            <ProfileSkeleton />
            <ProfileSkeleton />
          </div>
        ) : profiles.length === 0 ? (
          <div className="surface-shell p-6 text-sm text-zinc-600 dark:text-zinc-300">No synced profiles yet.</div>
        ) : (
          <div className="grid gap-3">
            {profiles.map((profile) => (
              <article
                key={profile.runId}
                className="rounded-[12px] border border-black/10 bg-white/92 p-4 shadow-[0_6px_14px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-[#0f7b49]/20 hover:shadow-[0_12px_24px_rgba(15,123,73,0.06)] dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#0f7b49,#111827)] text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,123,73,0.18)]">
                        {profile.companyName.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="truncate text-base font-semibold text-zinc-900 transition hover:text-[#0f7b49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:text-zinc-50"
                            href={`/runs/${profile.runId}`}
                          >
                            {profile.companyName}
                          </Link>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              profile.publishStatus === "publish_ready"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : profile.publishStatus === "needs_review"
                                  ? "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
                                  : "bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#86efac]"
                            }`}
                          >
                            {profile.publishStatus ?? profile.status}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-xs text-zinc-500 dark:text-zinc-400">{profile.websiteUrl}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 xl:min-w-[360px] xl:max-w-[420px]">
                    <div className="flex flex-wrap gap-2">
                      <span>Updated {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "n/a"}</span>
                      <span>Quality {profile.qualityScore ?? "n/a"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.blogTitle ? <span className="truncate">{profile.blogTitle}</span> : null}
                      {profile.progressPercent !== null ? (
                        <span>
                          {profile.progressPercent}%{profile.progressLabel ? ` • ${profile.progressLabel}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link
                      className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:-translate-y-0.5 hover:border-[#0f7b49]/25 hover:text-[#0f7b49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
                      href={`/runs/${profile.runId}`}
                    >
                      Open workspace
                    </Link>
                    {profile.hasBlog && profile.blogSlug ? (
                      <Link
                        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:-translate-y-0.5 hover:border-[#0f7b49]/25 hover:text-[#0f7b49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        href={`/runs/${profile.runId}/blog/${profile.blogSlug}`}
                        target="_blank"
                      >
                        Open preview
                      </Link>
                    ) : null}
                    <button
                      className="inline-flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-progress disabled:opacity-60 dark:text-rose-200"
                      type="button"
                      onClick={() => deleteProfile(profile.runId, profile.companyName)}
                      disabled={deletingRunId === profile.runId}
                      aria-label={`Delete ${profile.companyName}`}
                    >
                      {deletingRunId === profile.runId ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
