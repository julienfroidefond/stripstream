"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  CircleCheck,
  CircleDot,
  CirclePause,
  CircleX,
  Star,
  Tag,
  User,
} from "lucide-react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { communityScoreToTen } from "@/lib/providers/ratings";
import { SeriesCover } from "@/components/ui/series-cover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { cn, formatDate } from "@/lib/utils";

interface SeriesListProps {
  series: NormalizedSeries[];
  isCompact?: boolean;
}

const seriesStatusMap = {
  ongoing: { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: CircleDot },
  ended: { className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: CircleCheck },
  hiatus: { className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: CirclePause },
  cancelled: { className: "bg-red-500/10 text-red-600 dark:text-red-400", icon: CircleX },
} as const;

function getReadingStatus(
  series: NormalizedSeries,
  t: (key: string, options?: { [key: string]: string | number }) => string
) {
  if (series.bookCount === 0) return { label: t("series.status.noBooks"), className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  if (series.bookCount === series.booksReadCount) return { label: t("series.status.read"), className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
  if (series.booksReadCount > 0) return { label: t("series.status.progress", { read: series.booksReadCount, total: series.bookCount }), className: "bg-primary/10 text-primary" };
  return { label: t("series.status.unread"), className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <Badge variant="outline" className={cn("border-current/15 px-2 py-0.5 text-[11px] font-medium", className)}>{children}</Badge>;
}

const SeriesListItem = memo(function SeriesListItem({ series, isCompact = false }: { series: NormalizedSeries; isCompact?: boolean }) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const isCompleted = !isAnonymous && series.bookCount > 0 && series.bookCount === series.booksReadCount;
  const progress = series.bookCount ? (series.booksReadCount / series.bookCount) * 100 : 0;
  const readingStatus = !isAnonymous ? getReadingStatus(series, t) : null;
  const publicationStatus = series.seriesStatus ? seriesStatusMap[series.seriesStatus as keyof typeof seriesStatusMap] : null;
  const rating = communityScoreToTen(series.communityScore);
  const tags = Array.from(new Set([...(series.genres ?? []), ...(series.tags ?? [])]));

  return (
    <button
      type="button"
      onClick={() => router.push(`/series/${series.id}`)}
      className={cn(
        "group relative flex w-full items-stretch gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card/45 p-2.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:p-3",
        !isCompact && "sm:p-4",
        isCompleted && "opacity-70"
      )}
    >
      <div className={cn("relative aspect-[3/2] shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm", isCompact ? "w-16 sm:w-[4.5rem]" : "w-24 sm:w-28")}>
        <SeriesCover
          series={series}
          alt={t("series.coverAlt", { title: series.name })}
          isAnonymous={isAnonymous}
          showProgressUi={false}
        />
        {rating !== null && (
          <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 shadow-sm backdrop-blur-sm sm:hidden">
            <Star className="h-2.5 w-2.5 fill-current" />{rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5 sm:gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={cn("line-clamp-1 font-semibold tracking-tight transition-colors group-hover:text-primary", isCompact ? "text-sm sm:text-base" : "text-base sm:text-lg")}>{series.name}</h3>
            {series.summary && !isCompact && <p className="mt-0.5 hidden line-clamp-1 text-sm text-muted-foreground sm:block">{series.summary}</p>}
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {rating !== null && <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400"><Star className="h-3.5 w-3.5 fill-current" />{rating.toFixed(1)}</span>}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{t("series.books", { count: series.bookCount })}</span>
          {series.authors?.length ? <span className="inline-flex max-w-full items-center gap-1"><User className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{series.authors.map((author) => author.name).join(", ")}</span></span> : null}
          {series.createdAt && <span className="hidden items-center gap-1 md:inline-flex"><Calendar className="h-3.5 w-3.5" />{formatDate(series.createdAt)}</span>}
        </div>

        <div className="flex min-h-5 flex-wrap items-center gap-1.5">
          {publicationStatus && <Pill className={publicationStatus.className}><publicationStatus.icon className="mr-1 h-3 w-3" />{t(`series.status.${series.seriesStatus}`)}</Pill>}
          {readingStatus && <Pill className={readingStatus.className}>{readingStatus.label}</Pill>}
          {!isCompact && tags.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary" className="hidden max-w-28 gap-1 truncate px-2 py-0.5 text-[11px] font-normal text-secondary-foreground md:inline-flex"><Tag className="h-3 w-3 shrink-0" />{tag}</Badge>)}
          {!isCompact && tags.length > 2 && <Badge variant="outline" className="hidden px-1.5 py-0.5 text-[11px] text-muted-foreground md:inline-flex">+{tags.length - 2}</Badge>}
        </div>

        {!isAnonymous && series.bookCount > 0 && series.booksReadCount > 0 && !isCompleted && (
          <div className="mt-0.5 flex items-center gap-2.5"><Progress value={progress} className="h-1.5 max-w-48 flex-1" /><span className="text-[11px] tabular-nums text-muted-foreground">{Math.round(progress)}% {t("series.completed")}</span></div>
        )}
      </div>
    </button>
  );
});

export function SeriesList({ series, isCompact = false }: SeriesListProps) {
  const { t } = useTranslate();
  if (!series.length) return <div className="p-8 text-center text-muted-foreground">{t("series.empty")}</div>;

  return <div className={cn("space-y-3", isCompact && "space-y-2")}>{series.map((seriesItem) => <SeriesListItem key={seriesItem.id} series={seriesItem} isCompact={isCompact} />)}</div>;
}
