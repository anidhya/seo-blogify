export default function Loading() {
  return (
    <div className="px-6 py-6">
      <div className="h-8 w-52 animate-pulse rounded-full bg-black/5 dark:bg-white/10" />
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="h-64 animate-pulse rounded-[16px] bg-black/5 dark:bg-white/10" />
        <div className="h-64 animate-pulse rounded-[16px] bg-black/5 dark:bg-white/10" />
      </div>
      <div className="mt-5 h-72 animate-pulse rounded-[16px] bg-black/5 dark:bg-white/10" />
    </div>
  );
}
