export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[min(1600px,80vw)] px-5 py-7 max-lg:max-w-full">
      <div className="grid gap-6 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(98,69,39,0.12)]">
        <div className="h-8 w-44 animate-pulse rounded-full bg-neutral-200/80" />
        <div className="h-16 w-full animate-pulse rounded-[12px] bg-neutral-200/80" />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            <div className="h-64 animate-pulse rounded-[12px] bg-neutral-200/80" />
            <div className="h-56 animate-pulse rounded-[12px] bg-neutral-200/80" />
          </div>
          <div className="grid gap-4">
            <div className="h-64 animate-pulse rounded-[12px] bg-neutral-200/80" />
            <div className="h-48 animate-pulse rounded-[12px] bg-neutral-200/80" />
          </div>
        </div>
      </div>
    </main>
  );
}
