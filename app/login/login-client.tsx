"use client";

import { useState, useTransition, type FormEvent } from "react";

type Props = {
  nextPath: string;
  initialError: string | null;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.4l6.6-6.6C35.5 2.9 30.2 1 24 1 14.6 1 6.4 6.4 2.5 14.3l7.7 6C12 14.8 17.5 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8h12.8c-.3 2-1.6 5-4.7 7l7.2 5.6c4.3-4 6.8-9.8 6.8-16.5z" />
      <path fill="#FBBC05" d="M10.2 28.3a14.3 14.3 0 0 1-.8-4.8c0-1.7.3-3.3.8-4.8l-7.7-6A23.9 23.9 0 0 0 0 23.5c0 3.9.9 7.6 2.5 10.8l7.7-6z" />
      <path fill="#34A853" d="M24 47c6.2 0 11.5-2 15.4-5.5l-7.2-5.6c-2 1.4-4.7 2.4-8.2 2.4-6.5 0-12-5.3-14-12.5l-7.7 6C6.4 41.6 14.6 47 24 47z" />
    </svg>
  );
}

export default function LoginClient({ nextPath, initialError }: Props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(initialError);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setMessage("Enter your email address.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      setMagicLink(null);
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, next: nextPath })
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; magicLink?: string };
      if (!response.ok) {
        setMessage(data.error || "Unable to send a magic link.");
        return;
      }

      setMessage("Check your email for a sign-in link.");
      if (data.magicLink) {
        setMagicLink(data.magicLink);
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#f6f9f6] px-4 py-6 text-zinc-900 dark:bg-[#0f1011] dark:text-zinc-50">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden rounded-[28px] border border-black/[0.08] bg-white px-6 py-8 shadow-[0_18px_44px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-white/5 sm:px-8 sm:py-10">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -left-20 top-8 h-56 w-56 rounded-full bg-[#0f7b49]/[0.08] blur-3xl dark:bg-[#4ade80]/10" />
              <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[#2563eb]/[0.08] blur-3xl dark:bg-[#2563eb]/10" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7b49]/15 bg-[#0f7b49]/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f7b49] dark:text-[#86efac]">
                Marketier AI access
              </div>
              <h1 className="mt-5 max-w-xl font-display text-4xl tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                Sign in with Google or a magic link.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Use Google OAuth for Gmail or Google Workspace accounts. Use a magic link when you want a passwordless signup and sign-in flow.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a
                href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[#1d4ed8]/20 bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,78,216,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1e40af]"
              >
                <GoogleIcon />
                Continue with Google
              </a>
                <div className="inline-flex items-center justify-center rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-3 text-sm font-semibold text-zinc-500 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-400">
                  Workspace access required
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/[0.08] bg-white/80 p-4 dark:border-white/[0.08] dark:bg-white/5">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Google OAuth</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Fast sign-in for Gmail and Google Workspace accounts.</p>
                </div>
                <div className="rounded-2xl border border-black/[0.08] bg-white/80 p-4 dark:border-white/[0.08] dark:bg-white/5">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Magic links</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Passwordless signup and sign-in with a single emailed link.</p>
                </div>
                <div className="rounded-2xl border border-black/[0.08] bg-white/80 p-4 dark:border-white/[0.08] dark:bg-white/5">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Shared workspace</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Keep brand workflows in the same compact dashboard shell.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.08] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-white/5 sm:p-8">
            <h2 className="font-display text-2xl tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">Magic link</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              We&apos;ll email you a passwordless link that lands back in the app.
            </p>

            <form className="mt-6 grid gap-3" onSubmit={submitMagicLink}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl border border-black/[0.08] bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0f7b49]/30 focus:ring-4 focus:ring-[#0f7b49]/10 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  placeholder="name@company.com"
                />
              </label>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f7b49] dark:hover:bg-[#0e6a40]"
              >
                {isPending ? "Sending link..." : "Send magic link"}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-2xl border border-[#0f7b49]/15 bg-[#0f7b49]/[0.08] px-4 py-3 text-sm text-[#0f7b49] dark:text-[#86efac]">
                {message}
              </div>
            )}

            {magicLink && (
              <div className="mt-3 rounded-2xl border border-black/[0.08] bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-300">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Development link</p>
                <a href={magicLink} className="mt-2 block break-all text-[#0f7b49] underline decoration-[#0f7b49]/30 underline-offset-4 dark:text-[#86efac]">
                  {magicLink}
                </a>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-black/[0.08] bg-zinc-50 p-4 text-sm leading-6 text-zinc-500 dark:border-white/[0.08] dark:bg-white/5 dark:text-zinc-400">
              If Google OAuth or email delivery is not configured yet, set the environment variables in <code className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px] dark:bg-white/10">.env.local</code> and restart the app.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
