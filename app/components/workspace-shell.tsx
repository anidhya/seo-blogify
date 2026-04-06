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
  breadcrumbs?: Array<{ label: string; href?: string; active?: boolean }>;
};

function Icon({ icon }: { icon: NavIcon }) {
  const cls = "h-5 w-5 shrink-0";
  switch (icon) {
    case "sync":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M4 12a8 8 0 0 1 13.657-5.657L20 8.686" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 12a8 8 0 0 1-13.657 5.657L4 15.314" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "back":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "analysis":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "topics":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M5 6h14M5 12h14M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "articles":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M7 4h10l3 3v13H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "preview":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "linkedin":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M6.5 9.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 6.5h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M10 18V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 13c0-2 1-3.5 3-3.5s3 1.2 3 3.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "publish":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "plus":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "settings":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M19 12a7.4 7.4 0 0 0-.11-1.28l1.86-1.45-1.86-3.22-2.21.89a7.5 7.5 0 0 0-2.22-1.28l-.34-2.34H9.88l-.34 2.34a7.5 7.5 0 0 0-2.22 1.28l-2.21-.89-1.86 3.22 1.86 1.45A7.4 7.4 0 0 0 5 12c0 .44.04.87.11 1.28l-1.86 1.45 1.86 3.22 2.21-.89a7.5 7.5 0 0 0 2.22 1.28l.34 2.34h4.24l.34-2.34a7.5 7.5 0 0 0 2.22-1.28l2.21.89 1.86-3.22-1.86-1.45c.07-.41.11-.84.11-1.28Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case "sun":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "moon":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M16.2 13.7A7.2 7.2 0 0 1 10.3 5a7.2 7.2 0 1 0 8.7 8.7 7.3 7.3 0 0 1-2.8 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
  }
}

function StatusBadge({ status }: { status?: NavItem["status"] }) {
  if (!status || status === "idle") return null;
  const map = {
    in_progress: { label: "In progress", cls: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400" },
    complete:    { label: "Done",        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    needs_review:{ label: "Review",      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" }
  };
  const { label, cls } = map[status];
  return (
    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function NavLink({ item, step }: { item: NavItem; step?: number }) {
  return (
    <a
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        item.active
          ? "bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#4ade80]"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100"
      }`}
    >
      {step != null ? (
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          item.status === "complete"
            ? "bg-emerald-500 text-white"
            : item.active
              ? "bg-[#0f7b49] text-white"
              : "bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
        }`}>
          {item.status === "complete" ? "✓" : step}
        </span>
      ) : (
        <Icon icon={item.icon} />
      )}
      <span className="flex-1">{item.label}</span>
      <StatusBadge status={item.status} />
    </a>
  );
}

export default function WorkspaceShell({ title, subtitle, navItems, children, topAction, backHref, backLabel = "Back", breadcrumbs }: Props) {
  const { resolvedTheme, toggleTheme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const themeIcon = useMemo(() => (resolvedTheme === "dark" ? "sun" : "moon"), [resolvedTheme]);

  return (
    <div className="flex min-h-screen bg-[--page-bg] text-zinc-900 dark:text-zinc-50">

      {/* ── Left Sidebar ── */}
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-black/8 bg-white dark:border-white/8 dark:bg-[#111]">

        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-black/8 px-4 py-4 dark:border-white/8">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0f7b49,#111827)] shadow-sm">
            <span className="font-display text-sm font-bold text-white leading-none">M</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">Marketier AI</p>
            <p className="text-[11px] text-zinc-400">v0.1</p>
          </div>
        </div>

        {/* Back button */}
        {backHref && (
          <div className="px-3 pt-3">
            <a
              href={backHref}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100"
            >
              <Icon icon="back" />
              {backLabel}
            </a>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 pt-3">
          {/* Split: workflow items (have status) vs main nav items */}
          {(() => {
            const mainItems = navItems.filter((i) => i.status === undefined && !["analysis","topics","articles","preview","linkedin"].includes(i.icon));
            const workflowItems = navItems.filter((i) => i.status !== undefined || ["analysis","topics","articles","preview","linkedin"].includes(i.icon));

            return (
              <>
                {mainItems.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Menu</p>
                    <div className="flex flex-col gap-0.5">
                      {mainItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {workflowItems.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Workflow</p>
                    <div className="flex flex-col gap-0.5">
                      {workflowItems.map((item, i) => (
                        <NavLink key={item.href} item={item} step={i + 1} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-black/8 px-3 py-3 dark:border-white/8">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100"
          >
            <Icon icon={themeIcon} />
            <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100"
          >
            <Icon icon="settings" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar (breadcrumbs / actions) */}
        {(breadcrumbs?.length || topAction || subtitle) ? (
          <header className="flex items-center justify-between gap-4 border-b border-black/8 bg-white px-6 py-3 dark:border-white/8 dark:bg-[#111]">
            <div className="flex min-w-0 items-center gap-2">
              {breadcrumbs?.length ? (
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                      {i > 0 && <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</span>}
                      {crumb.href && !crumb.active ? (
                        <a href={crumb.href} className="transition hover:text-[#0f7b49] dark:hover:text-[#4ade80]">{crumb.label}</a>
                      ) : (
                        <span className={crumb.active ? "font-medium text-zinc-900 dark:text-zinc-100" : ""}>{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              ) : subtitle ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
              ) : null}
            </div>
            {topAction && <div className="shrink-0">{topAction}</div>}
          </header>
        ) : null}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Settings modal ── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1a1a1f]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Settings</h3>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Theme preferences</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Theme</p>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                      mode !== "system" && mode === resolvedTheme
                        ? "border-[#0f7b49]/30 bg-[#0f7b49]/10 text-[#0f7b49] dark:text-[#4ade80]"
                        : "border-black/8 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-black/6 bg-zinc-50 px-4 py-3 dark:border-white/8 dark:bg-white/3">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Marketier AI <span className="font-normal text-zinc-400">0.1</span></p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Brand-sync blog workflow</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
