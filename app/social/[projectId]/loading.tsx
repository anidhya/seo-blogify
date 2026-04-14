export default function Loading() {
  return (
    <div className="px-6 py-6">
      <div className="h-8 w-64 animate-pulse rounded-full bg-black/5 dark:bg-white/10" />
      <div className="mt-5 grid gap-5">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-72 animate-pulse rounded-[16px] bg-black/5 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}
