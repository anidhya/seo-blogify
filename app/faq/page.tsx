import Link from "next/link";
import WorkspaceShell from "../components/workspace-shell";

const faqs = [
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
  },
  {
    question: "Where do saved profiles live?",
    answer: "Each workflow run is stored locally under data/runs/<runId>/ so the workspace can resume from saved state."
  }
];

export default function FaqPage() {
  return (
    <WorkspaceShell
      title="Marketier AI 0.1"
      subtitle="Common questions before the first sync."
      backHref="/"
      backLabel="Home"
      breadcrumbs={[
        { label: "Sync", href: "/" },
        { label: "FAQ", active: true }
      ]}
      topAction={
        <Link
          className="inline-flex items-center justify-center rounded-full border border-[#0f7b49]/20 bg-[#0f7b49]/10 px-4 py-2 text-sm font-medium text-[#0f7b49] transition hover:-translate-y-0.5 hover:bg-[#0f7b49]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7b49]/25"
          href="/"
        >
          Back to sync
        </Link>
      }
      navItems={[
        { label: "Sync", href: "/", icon: "sync" },
        { label: "Profiles", href: "/profiles", icon: "articles" },
        { label: "FAQ", href: "/faq", icon: "publish", active: true }
      ]}
    >
      <section className="surface-shell grid gap-4 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">FAQ</p>
          <h1 className="mt-1 font-display text-3xl tracking-[-0.04em] text-zinc-900 dark:text-zinc-50">Questions, answered</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Short answers for the workflow, before you sync a brand.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map((item) => (
            <details
              className="group rounded-[12px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,247,0.95))] p-4 shadow-[0_6px_14px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#0f7b49]/25 hover:shadow-[0_12px_24px_rgba(15,123,73,0.08)] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/7"
              key={item.question}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f7b49]/10 text-xs font-semibold text-[#0f7b49] dark:bg-white/10 dark:text-[#86efac]">
                  ?
                </span>
                <span>{item.question}</span>
              </summary>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
