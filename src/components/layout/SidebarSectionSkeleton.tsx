export function SidebarSectionSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-background/30 p-2">
      <div className="space-y-2 px-3 py-1">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-7 w-full animate-pulse rounded bg-muted/60" />
        <div className="h-7 w-full animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}
