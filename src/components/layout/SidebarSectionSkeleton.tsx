export function SidebarSectionSkeleton() {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <div className="space-y-2 px-3 py-1">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />{/* taste-skill-ignore: placeholder de chargement */}
        <div className="h-7 w-full animate-pulse rounded bg-muted/60" />{/* taste-skill-ignore: placeholder de chargement */}
        <div className="h-7 w-full animate-pulse rounded bg-muted/60" />{/* taste-skill-ignore: placeholder de chargement */}
      </div>
    </div>
  );
}
