import { Skeleton } from "@/components/ui/skeleton";

function CoverGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="aspect-2/3 w-full rounded-xl" />
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
      <div className="relative min-h-[220px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden border-y border-border/60 bg-muted/50 md:h-[220px]">
        <div className="container mx-auto h-full px-4 py-8">
          <div className="flex h-full flex-col items-center gap-6 md:flex-row md:items-start">
            <Skeleton className="h-[120px] w-[120px] shrink-0 rounded-xl" />
            <div className="flex-1 space-y-4 text-center md:text-left">
              <Skeleton className="mx-auto h-10 w-64 max-w-full md:mx-0" />
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border/60 bg-background/45 p-2 md:justify-start">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-(--breakpoint-2xl) px-2 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4 shadow-xs sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-24" />
              </div>
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
          <CoverGrid />
        </div>
      </main>
    </>
  );
}

export function ReadingListSkeleton() {
  return (
    <>
      <div className="relative min-h-[200px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden bg-muted/50">
        <div className="container mx-auto space-y-8 px-4 pb-8 pt-10">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-6">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-72 max-w-[60vw]" />
              <Skeleton className="h-5 w-44" />
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-(--breakpoint-2xl) px-2 py-8 sm:px-6 lg:px-8">
        <CoverGrid />
      </main>
    </>
  );
}

export function ReadingListsSkeleton() {
  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) space-y-8 px-2 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="space-y-2"><Skeleton className="h-8 w-52" /><Skeleton className="h-5 w-72" /></div>
      </div>
      <div className="flex gap-3 rounded-2xl border border-border/60 p-3"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-60" /></div>
      <CoverGrid count={12} />
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
        <div className="flex items-start justify-between"><PageHeading /><Skeleton className="h-10 w-28" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
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
    <main className="grid min-h-screen lg:grid-cols-2">
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
