export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-7">
      <section className="grid gap-6">
        <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
          <div className="animate-pulse space-y-4" aria-hidden="true">
            <div className="h-5 w-44 rounded-full bg-black/5" />
            <div className="h-12 w-2/3 rounded-full bg-black/5" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-16 rounded-3xl bg-black/5" />
              <div className="h-16 rounded-3xl bg-black/5" />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)] backdrop-blur">
          <div className="animate-pulse space-y-4" aria-hidden="true">
            <div className="h-5 w-56 rounded-full bg-black/5" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-32 rounded-3xl bg-black/5" />
              <div className="h-32 rounded-3xl bg-black/5" />
              <div className="h-32 rounded-3xl bg-black/5" />
              <div className="h-32 rounded-3xl bg-black/5" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
