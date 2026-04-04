"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "./theme-provider";

type NavIcon = "back" | "sync" | "analysis" | "topics" | "articles" | "preview" | "linkedin" | "publish" | "plus" | "settings" | "sun" | "moon";

type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  active?: boolean;
  status?: "idle" | "in_progress" | "complete" | "needs_review";
  title?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  children: ReactNode;
  topAction?: ReactNode;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
    active?: boolean;
  }>;
};

function Icon({ icon }: { icon: NavIcon }) {
  const common = "h-4 w-4";

  switch (icon) {
    case "sync":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M4 12a8 8 0 0 1 13.657-5.657L20 8.686" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 12a8 8 0 0 1-13.657 5.657L4 15.314" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "back":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 12h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "analysis":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "topics":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M5 6h14M5 12h14M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m8 5 1 1 2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "articles":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M7 4h10l3 3v13H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "preview":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "linkedin":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M6.5 9.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 6.5h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M10 18V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 13c0-2 1-3.5 3-3.5s3 1.2 3 3.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "publish":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m7 8 5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "plus":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "settings":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19 12a7.4 7.4 0 0 0-.11-1.28l1.86-1.45-1.86-3.22-2.21.89a7.5 7.5 0 0 0-2.22-1.28l-.34-2.34H9.88l-.34 2.34a7.5 7.5 0 0 0-2.22 1.28l-2.21-.89-1.86 3.22 1.86 1.45A7.4 7.4 0 0 0 5 12c0 .44.04.87.11 1.28l-1.86 1.45 1.86 3.22 2.21-.89a7.5 7.5 0 0 0 2.22 1.28l.34 2.34h4.24l.34-2.34a7.5 7.5 0 0 0 2.22-1.28l2.21.89 1.86-3.22-1.86-1.45c.07-.41.11-.84.11-1.28Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "sun":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "moon":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
          <path
            d="M16.2 13.7A7.2 7.2 0 0 1 10.3 5a7.2 7.2 0 1 0 8.7 8.7 7.3 7.3 0 0 1-2.8 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function statusClass(status?: NavItem["status"]) {
  switch (status) {
    case "complete":
      return "bg-emerald-500/15 text-emerald-300";
    case "in_progress":
      return "bg-sky-500/15 text-sky-300";
    case "needs_review":
      return "bg-amber-500/15 text-amber-300";
    default:
      return "bg-white/8 text-zinc-400";
  }
}

export default function WorkspaceShell({ title, subtitle, navItems, children, topAction, backHref, backLabel = "Back", breadcrumbs }: Props) {
  const { resolvedTheme, toggleTheme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const themeIcon = useMemo(() => (resolvedTheme === "dark" ? "sun" : "moon"), [resolvedTheme]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(195,93,46,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_18%),linear-gradient(180deg,#faf8f4_0%,#f5efe7_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top_left,rgba(195,93,46,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_18%),linear-gradient(180deg,#0f0f12_0%,#101114_100%)] dark:text-zinc-50">
      <div className="grid min-h-screen w-full grid-cols-1 gap-0 lg:grid-cols-[76px_minmax(0,1fr)]">
        <aside className="sticky top-0 z-30 self-start lg:h-screen">
          <div className="flex h-full flex-row items-center gap-2 border border-transparent bg-transparent px-1 py-1 shadow-none backdrop-blur-0 lg:flex-col lg:items-stretch">
            {backHref ? (
              <a
                className="group flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] border border-transparent bg-white/65 px-2 py-2 text-center text-[10px] font-semibold text-zinc-500 transition hover:-translate-y-0.5 hover:bg-white/90 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 lg:min-w-0 lg:flex-none dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100"
                href={backHref}
                aria-label={backLabel}
                title={backLabel}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/70 text-zinc-500 dark:bg-white/5 dark:text-zinc-300">
                  <Icon icon="back" />
                </span>
                <span className="hidden leading-tight lg:block">{backLabel}</span>
              </a>
            ) : null}
            <Link
              className="flex items-center justify-center rounded-[12px] border border-white/10 bg-white/80 px-2 py-2 lg:px-2 lg:py-2.5 dark:border-white/8 dark:bg-white/5"
              href="/"
              aria-label="Go to home"
              title="Go to home"
            >
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] bg-[linear-gradient(135deg,#0f7b49,#111827)] text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,123,73,0.26)]">
                <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_45%)]" />
                <span className="relative font-display text-[1.05rem] leading-none tracking-[-0.08em]">M</span>
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#86efac] shadow-[0_0_0_3px_rgba(134,239,172,0.15)]" />
              </div>
            </Link>

            <nav className="flex flex-1 flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.title ?? item.label}
                  aria-current={item.active ? "page" : undefined}
                  className={`group flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] border px-2 py-2 text-center text-[10px] font-semibold transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 lg:min-w-0 lg:flex-none ${
                    item.active
                      ? "border-[#0f7b49]/30 bg-white/70 text-zinc-900 shadow-[0_16px_30px_rgba(15,123,73,0.12)] dark:bg-white/10 dark:text-white dark:shadow-[0_16px_30px_rgba(15,123,73,0.18)]"
                      : "border-transparent bg-white/60 text-zinc-500 hover:border-white/10 hover:bg-white/90 hover:text-zinc-900 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition ${
                      item.active
                        ? "border-[#0f7b49]/25 bg-[#0f7b49]/10 text-[#0f7b49] dark:bg-white/10 dark:text-[#4ade80]"
                        : "border-white/10 bg-white/5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                    }`}
                  >
                    <Icon icon={item.icon} />
                  </span>
                  <span className="hidden leading-tight lg:block">{item.label}</span>
                  {item.status ? <span className={`rounded-full px-2 py-0.5 text-[9px] ${statusClass(item.status)}`}>{item.status}</span> : null}
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-row gap-1 lg:flex-col">
              <button
                className="group flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] border border-transparent bg-white/70 px-2 py-2 text-center text-[10px] font-semibold text-zinc-500 transition hover:-translate-y-0.5 hover:bg-white/90 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 lg:min-w-0 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100"
                type="button"
                onClick={() => setSettingsOpen(true)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/70 text-zinc-500 dark:bg-white/5 dark:text-zinc-300">
                  <Icon icon="settings" />
                </span>
                <span className="hidden leading-tight lg:block">Settings</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="relative flex min-h-screen flex-col gap-3 border border-transparent bg-transparent p-0 shadow-none backdrop-blur-0 lg:p-0">
            <header className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-white/10 bg-white/85 px-3 py-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-white/5 dark:shadow-none">
              <div className="min-w-0">
                {breadcrumbs?.length ? (
                  <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                        {index > 0 ? <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</span> : null}
                        {crumb.href && !crumb.active ? (
                          <a className="transition hover:text-[#0f7b49] dark:hover:text-[#86efac]" href={crumb.href}>
                            {crumb.label}
                          </a>
                        ) : (
                          <span className={crumb.active ? "text-zinc-900 dark:text-zinc-50" : ""}>{crumb.label}</span>
                        )}
                      </span>
                    ))}
                  </nav>
                ) : null}
                {subtitle ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {topAction ? <div className="shrink-0">{topAction}</div> : null}
                <button
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/75 text-zinc-700 transition hover:-translate-y-0.5 hover:border-[#0f7b49]/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                type="button"
                title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
                aria-label="Toggle theme"
                  onClick={toggleTheme}
                >
                  <Icon icon={themeIcon} />
                </button>
                <button
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/75 text-zinc-700 transition hover:-translate-y-0.5 hover:border-[#0f7b49]/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                type="button"
                title="Power"
                aria-label="Power"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path d="M12 3v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M6.5 5.5a8 8 0 1 0 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="min-w-0">{children}</div>
          </div>
        </main>
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-black/35 p-3 backdrop-blur-sm lg:items-center lg:justify-center">
          <div className="w-full max-w-lg rounded-[16px] border border-white/10 bg-white/94 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:bg-[rgba(18,18,22,0.96)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">Settings</p>
                <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50">Marketier AI 0.1</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Theme, workspace identity, and future account controls.</p>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/80 text-zinc-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/30 dark:bg-white/5 dark:text-zinc-300"
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <section className="rounded-[12px] border border-white/10 bg-white/75 p-4 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Theme</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["light", "dark", "system"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                        mode === "light" && resolvedTheme === "light"
                          ? "bg-[#0f7b49] text-white"
                          : mode === "dark" && resolvedTheme === "dark"
                            ? "bg-[#111827] text-white dark:bg-white dark:text-zinc-900"
                            : "border border-white/10 bg-white/70 text-zinc-600 hover:bg-white dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                      }`}
                      type="button"
                      onClick={() => setTheme(mode)}
                    >
                      {mode === "system" ? "System" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[12px] border border-white/10 bg-white/75 p-4 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Product</p>
                <div className="mt-3 grid gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <p>
                    Name: <span className="font-semibold text-zinc-900 dark:text-zinc-50">Marketier</span>
                  </p>
                  <p>
                    UI label: <span className="font-semibold text-zinc-900 dark:text-zinc-50">Marketier AI</span>
                  </p>
                  <p>
                    Version: <span className="font-semibold text-zinc-900 dark:text-zinc-50">0.1</span>
                  </p>
                </div>
              </section>

              <section className="rounded-[12px] border border-white/10 bg-white/75 p-4 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Workspace</p>
                <div className="mt-3 grid gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <p>Compact nav, action-first layout, and dual theme support are enabled.</p>
                  <p>LinkedIn and publishing controls stay article-scoped per workflow run.</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
