"use client";

import type { RunBundle } from "@/lib/storage";

type Props = {
  runId: string;
  run: RunBundle;
};

export default function RunWorkspaceClient({ runId, run }: Props) {
  const analysis = run.analysis?.analysis ?? null;
  const input = run.input ?? null;
  const blogSources = run.research?.blogs ?? [];
  const sitemapUrls = run.research?.sitemapUrls ?? [];

  return (
    <section className="grid gap-3">
      <div className="surface-shell p-4">
        <div className="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
              Run workspace
            </div>
            <h1 className="mt-3 max-w-2xl font-display text-3xl tracking-[-0.04em] text-zinc-50 md:text-4xl">
              {input?.companyName || "Untitled brand"}
            </h1>
            <p className="mt-2 text-sm text-zinc-400 md:text-[15px]">
              {input?.websiteUrl || "No website URL"} · {run.manifest?.status ?? "created"}
            </p>
          </div>

          <div className="rounded-[12px] border border-white/8 bg-white/5 p-4 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">
            <strong className="block text-xs uppercase tracking-[0.18em] text-zinc-400">Run ID</strong>
            <p className="mt-2 text-sm text-zinc-200">{runId}</p>
            <p className="mt-1 text-sm text-zinc-400">Manifest: {run.manifest?.status ?? "created"}</p>
            <p className="mt-1 text-sm text-zinc-400">Approved articles: {run.approvedArticles?.articles?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {analysis ? (
        <section id="analysis" className="surface-shell scroll-mt-24 p-4">
          <div className="flex items-start justify-between gap-4 max-md:flex-col">
            <div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0a66c2]" />
                Brand Analysis
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-zinc-50">Analysis so far</h2>
              <p className="text-sm text-zinc-400">Brand summary, audience, voice, SEO notes, and source coverage from the sync.</p>
            </div>
            <div className="grid gap-3 rounded-[12px] border border-white/8 bg-white/5 p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Site Sources</p>
              <div className="grid gap-2 text-sm text-zinc-300">
                <p>
                  Website: <span className="font-medium text-zinc-50">{input?.websiteUrl ?? "n/a"}</span>
                </p>
                <p>
                  Blog URLs: <span className="font-medium text-zinc-50">{blogSources.length}</span>
                </p>
                <p>
                  Sitemap URLs: <span className="font-medium text-zinc-50">{sitemapUrls.length}</span>
                </p>
              </div>
              <div className="max-h-32 overflow-auto rounded-[12px] border border-white/8 bg-white/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Blog URL list</p>
                <div className="mt-2 grid gap-2 text-xs text-zinc-400">
                  {blogSources.length === 0 ? (
                    <p>No blog URLs discovered.</p>
                  ) : (
                    blogSources.map((page) => (
                      <div key={page.url} className="rounded-[12px] border border-white/8 bg-white/5 px-3 py-2">
                        <p className="font-medium text-zinc-100">{page.title}</p>
                        <p className="break-all text-zinc-400">{page.url}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {run.research?.resolvedSitemapUrl ? (
                <p className="text-xs text-zinc-400">
                  Resolved sitemap: <span className="break-all text-zinc-200">{run.research.resolvedSitemapUrl}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">Audience</span>
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">Voice</span>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">SEO</span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Coverage</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-sky-500/15 bg-sky-500/8 p-4 shadow-[0_8px_18px_rgba(10,102,194,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">Audience</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{analysis.audience}</p>
            </div>
            <div className="rounded-[12px] border border-violet-500/15 bg-violet-500/8 p-4 shadow-[0_8px_18px_rgba(139,92,246,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">Reading Level</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{analysis.writingStyle.readingLevel}</p>
            </div>
            <div className="rounded-[12px] border border-amber-500/15 bg-amber-500/8 p-4 shadow-[0_8px_18px_rgba(245,158,11,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Company Summary</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{analysis.companySummary}</p>
            </div>
            <div className="rounded-[12px] border border-emerald-500/15 bg-emerald-500/8 p-4 shadow-[0_8px_18px_rgba(34,197,94,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Vision</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{analysis.vision}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-white/8 bg-white/5 p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
              <h3 className="text-base font-semibold text-zinc-50">Brand Voice</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.brandVoice.map((voice) => (
                  <span className="rounded-full bg-[#0f7b49]/10 px-3 py-1 text-xs font-medium text-[#86efac]" key={voice}>
                    {voice}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[12px] border border-white/8 bg-white/5 p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
              <h3 className="text-base font-semibold text-zinc-50">SEO Observations</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.seoObservations.map((item) => (
                  <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </section>
      ) : null}
    </section>
  );
}
