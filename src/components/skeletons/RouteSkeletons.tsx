import { Skeleton } from "@/components/ui/skeleton";

/**
 * Les squelettes de route reprennent les classes des vrais écrans (bandeau,
 * barre d'outils, grille) pour que le contenu chargé ne déplace rien sous le
 * curseur : mêmes hauteurs, mêmes colonnes, mêmes gouttières.
 */
const GRID = {
  /** Grille du catalogue (SeriesGrid). */
  series: "grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-5",
  /** Grille des tomes (BookGrid). */
  books: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5",
  /** Grille des listes de lecture, avec légende sous la couverture. */
  lists: "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
} as const;

type GridVariant = keyof typeof GRID;

function Cover({ className }: { className?: string }) {
  return <Skeleton className={className ?? "aspect-2/3 w-full rounded-xl"} />;
}

function CoverGrid({ count = 20, variant = "series" }: { count?: number; variant?: GridVariant }) {
  if (variant === "lists") {
    return (
      <div className={GRID.lists}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Cover />
            <div className="space-y-0.5 px-0.5">
              <Skeleton className="h-5 w-4/5 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={GRID[variant]}>
      {Array.from({ length: count }).map((_, index) => (
        <Cover key={index} className={variant === "books" ? "aspect-2/3 w-full rounded-lg" : undefined} />
      ))}
    </div>
  );
}

function PageHeading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-80 max-w-full" />
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <>
      {/* Bandeau : 320 px de haut, affiche et titre alignés en bas. */}
      <div className="relative w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
        <div className="absolute inset-0 bg-surface-2" />
        <div className="relative container mx-auto flex min-h-[240px] items-end px-4 py-8 md:min-h-[320px] md:py-10">
          <div className="flex w-full items-end gap-5 md:gap-8">
            <Skeleton className="aspect-2/3 w-[92px] shrink-0 rounded-xl md:w-[136px]" />
            <div className="min-w-0 flex-1 space-y-3 pb-1">
              <Skeleton className="h-9 w-64 max-w-full md:h-12" />
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-(--breakpoint-2xl) px-2 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="rounded-2xl bg-surface-1 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-28" />
              </div>
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-20 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </div>
          </div>
          <CoverGrid count={30} variant="series" />
        </div>
      </main>
    </>
  );
}

/** Bandeau de série : 384 px, affiche, méta, genres, résumé, actions. */
export function SeriesSkeleton() {
  return (
    <>
      <div className="relative w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
        <div className="absolute inset-0 bg-surface-2" />
        <div className="relative container mx-auto flex min-h-[260px] items-end px-4 pb-8 pt-12 md:min-h-[340px] md:pb-10 md:pt-16">
          <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-end md:gap-8">
            <Skeleton className="aspect-2/3 w-[132px] shrink-0 rounded-xl md:w-[168px]" />
            <div className="min-w-0 flex-1 space-y-3 text-center md:pb-1 md:text-left">
              <Skeleton className="mx-auto h-9 w-72 max-w-full md:mx-0 md:h-12" />
              <Skeleton className="mx-auto h-5 w-56 md:mx-0" />
              <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="mx-auto w-full max-w-3xl space-y-1 md:mx-0">
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="mt-1 h-5 w-24 rounded" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-3 md:justify-start">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-(--breakpoint-2xl) px-2 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8 py-8">
          <div className="flex flex-col gap-4">
            <Skeleton className="ml-auto h-5 w-32" />
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
          <CoverGrid count={20} variant="books" />
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Skeleton className="order-2 h-5 w-32 sm:order-1" />
            <Skeleton className="order-1 h-10 w-64 sm:order-2" />
          </div>
        </div>
        <div className="mt-10 pb-4">
          <Skeleton className="h-[376px] w-full rounded-2xl" />
        </div>
      </main>
    </>
  );
}

export function ReadingListSkeleton() {
  return (
    <>
      <div className="relative min-h-[200px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden bg-surface-2">
        <div className="container relative mx-auto space-y-8 px-4 pb-8 pt-10">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-6">
            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
            <div className="space-y-1">
              <Skeleton className="h-9 w-72 max-w-[60vw]" />
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-(--breakpoint-2xl) px-2 py-8 sm:px-6 lg:px-8">
        <div className="py-8">
          <CoverGrid count={20} variant="series" />
        </div>
      </main>
    </>
  );
}

export function ReadingListsSkeleton() {
  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) space-y-8 px-2 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
      </header>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-1 p-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      <CoverGrid count={20} variant="lists" />
    </main>
  );
}

export function AccountSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeading />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </main>
  );
}

export function AdminSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </main>
  );
}

export function SettingsSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="space-y-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-[420px] rounded-xl" />
        </div>
      </div>
    </main>
  );
}

export function LoginSkeleton() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden bg-muted/50 lg:block" />
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-[350px] space-y-6">
          <Skeleton className="mx-auto h-32 w-32 rounded-full" />
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </main>
  );
}
