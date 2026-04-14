import { notFound } from "next/navigation";
import Link from "next/link";
import WorkspaceShell from "@/app/components/workspace-shell";
import { loadSocialProject } from "@/lib/storage";
import SocialProjectClient from "./social-project-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ connected?: string; social_error?: string }>;
};

export default async function SocialProjectPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = searchParams ? await searchParams : {};
  const project = await loadSocialProject(projectId);

  if (!project) {
    notFound();
  }

  return (
    <WorkspaceShell
      title={project.title}
      subtitle="Edit per-platform drafts, capture reviewer comments, and schedule posts."
      backHref="/social"
      backLabel="Social studio"
      breadcrumbs={[
        { label: "Social studio", href: "/social" },
        { label: project.title, active: true }
      ]}
      topAction={
        <Link
          href="/social"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
        >
          New social project
        </Link>
      }
      navItems={[
        { label: "Overview", href: "#overview", icon: "social", active: true },
        { label: "Instagram", href: "#instagram", icon: "instagram" },
        { label: "LinkedIn", href: "#linkedin", icon: "linkedin" },
        { label: "X", href: "#x", icon: "x" },
        { label: "Schedule", href: "#schedule", icon: "publish" }
      ]}
    >
      <div className="grid gap-4">
        {query.connected === "1" ? (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            Account connected. Direct publishing is now available for this project.
          </div>
        ) : null}
        {query.social_error ? (
          <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
            {query.social_error}
          </div>
        ) : null}
        <SocialProjectClient initialProject={project} />
      </div>
    </WorkspaceShell>
  );
}
