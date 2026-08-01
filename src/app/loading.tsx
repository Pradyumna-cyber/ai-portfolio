export default function Loading() {
  return (
    <div className="shell page-space" aria-busy="true">
      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-20 max-w-3xl animate-pulse rounded bg-muted" />
      <div className="mt-12 h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
