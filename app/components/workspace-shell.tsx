"use client";

import type { ReactNode } from "react";

type NavIcon = "sync" | "analysis" | "topics" | "articles" | "preview" | "linkedin" | "publish";

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
  }
}

function statusClass(status?: NavItem["status"]) {
  switch (status) {
    case "complete":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
      return "bg-[#dbeafe] text-[#1d4ed8]";
    case "needs_review":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

export default function WorkspaceShell({ title, subtitle, navItems, children, topAction }: Props) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(195,93,46,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(15,123,73,0.11),transparent_18%),linear-gradient(180deg,#f8f4ed_0%,#f4efe6_100%)] text-neutral-900">
      <div className="mx-auto grid min-h-screen max-w-[min(1520px,96vw)] grid-cols-1 gap-4 px-3 py-3 lg:grid-cols-[84px_minmax(0,1fr)] lg:px-4">
        <aside className="sticky top-3 z-30 self-start lg:h-[calc(100vh-1.5rem)]">
          <div className="flex h-full flex-row items-center gap-3 rounded-[1.75rem] border border-black/10 bg-[rgba(255,252,247,0.92)] px-3 py-3 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur lg:flex-col lg:items-stretch">
            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 px-3 py-2 lg:flex-col lg:items-center lg:px-2 lg:py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c35d2e,#e07b42)] text-sm font-semibold text-white shadow-sm">
                B
              </div>
              <div className="hidden lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Blogify</p>
                <p className="text-xs text-neutral-600">Workflow</p>
              </div>
            </div>

            <nav className="flex flex-1 flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.title ?? item.label}
                  aria-current={item.active ? "page" : undefined}
                  className={`group flex min-w-[62px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[11px] font-semibold transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c35d2e]/25 lg:min-w-0 lg:flex-none ${
                    item.active
                      ? "border-[#c35d2e]/25 bg-[#fff4ea] text-[#9a4520] shadow-[0_12px_30px_rgba(195,93,46,0.12)]"
                      : "border-transparent bg-white/60 text-neutral-500 hover:border-black/10 hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition ${
                      item.active
                        ? "border-[#c35d2e]/20 bg-white text-[#c35d2e]"
                        : "border-black/5 bg-neutral-50 text-neutral-600 group-hover:text-neutral-900"
                    }`}
                  >
                    <Icon icon={item.icon} />
                  </span>
                  <span className="hidden leading-tight lg:block">{item.label}</span>
                  {item.status ? <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusClass(item.status)}`}>{item.status}</span> : null}
                </a>
              ))}
            </nav>

            <div className="hidden rounded-2xl border border-black/5 bg-white/80 p-2 lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Status</p>
              <p className="mt-1 text-xs text-neutral-700">{subtitle ?? "Workspace"}</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="flex min-h-[calc(100vh-1.5rem)] flex-col gap-4 rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.76)] p-4 shadow-[0_20px_60px_rgba(98,69,39,0.10)] backdrop-blur lg:p-6">
            <header className="flex flex-wrap items-start justify-between gap-4 rounded-[1.5rem] border border-black/5 bg-white/70 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{title}</p>
                {subtitle ? <p className="mt-1 text-sm text-neutral-600">{subtitle}</p> : null}
              </div>
              {topAction ? <div className="shrink-0">{topAction}</div> : null}
            </header>

            <div className="min-w-0">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
