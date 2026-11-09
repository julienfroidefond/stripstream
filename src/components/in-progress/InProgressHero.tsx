"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Clock,
  LibraryBig,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeriesCover } from "@/components/ui/series-cover";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";
import { ProgressFill } from "@/components/motion";
import { useTranslate } from "@/hooks/useTranslate";
import {
  getBookProgressPercent,
  type InProgressItem,
} from "@/lib/services/in-progress.service";
import { InProgressFavoriteButton } from "./InProgressFavoriteButton";
import { RelativeTime } from "./RelativeTime";
import { useBookLabel } from "./useBookLabel";

interface InProgressHeroProps {
  item: InProgressItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  now: number;
}

export function InProgressHero({
  item,
  isFavorite,
  onToggleFavorite,
  now,
}: InProgressHeroProps) {
  const { t } = useTranslate();
  const getBookLabel = useBookLabel();
  const { series, currentBook, nextBook, resumeBook, remainingBooks, progressPercent } = item;

  const resumeHref = resumeBook ? `/books/${resumeBook.id}` : `/series/${series.id}`;
  const resumeLabel = currentBook
    ? t("inProgress.hero.resume")
    : resumeBook
      ? series.booksReadCount > 0
        ? t("inProgress.hero.continue")
        : t("inProgress.hero.start")
      : t("inProgress.hero.chooseBook");
  const bookLabel = resumeBook ? getBookLabel(resumeBook) : null;
  const authors = (series.authors ?? [])
    .map((author) => author.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  const genres = (series.genres ?? []).filter(Boolean).slice(0, 2);
  const summary = series.summary?.trim();
  const meta = [authors, series.startYear ? String(series.startYear) : null, ...genres]
    .filter(Boolean)
    .join(" • ");
  const page = currentBook?.readProgress?.page ?? 0;
  const totalPages = currentBook?.pageCount ?? 0;
  const pagePercent = getBookProgressPercent(currentBook);
  const almostDone = remainingBooks <= 2;

  return (
    <section
      className="group relative overflow-hidden rounded-2xl"
      data-testid="in-progress-hero"
      aria-labelledby="in-progress-hero-title"
    >
      <ProjectionBackdrop
        src={resumeBook?.thumbnailUrl || series.thumbnailUrl}
        position="top"
      />

      <div className="relative px-5 py-6 sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
          <div className="hero-depth-cover mx-auto shrink-0 sm:mx-0">
            <Link
              href={resumeHref}
              className="hero-cover-shadow relative block aspect-2/3 w-[168px] overflow-hidden rounded-xl sm:w-[196px]"
              aria-label={t("inProgress.coverLink", { title: series.name })}
            >
              <span className="relative block h-full w-full">
                <SeriesCover
                  series={series}
                  alt={t("series.coverAlt", { title: series.name })}
                  showProgressUi={false}
                  eager
                  fetchPriority="high"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-border"
                />
                {almostDone && (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-primary/90 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                    {t("inProgress.card.almostDone")}
                  </span>
                )}
              </span>
            </Link>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4 text-center text-foreground sm:text-left">
            <div className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start">
              <BookOpenCheck className="h-3.5 w-3.5" />
              {t("inProgress.eyebrow")}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-center gap-3 sm:justify-start">
                <h2
                  id="in-progress-hero-title"
                  className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl"
                >
                  {series.name}
                </h2>
                <InProgressFavoriteButton
                  seriesId={series.id}
                  seriesName={series.name}
                  isFavorite={isFavorite}
                  onToggle={onToggleFavorite}
                  className="mt-1"
                />
              </div>
              {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
            </div>

            {summary && (
              <p className="line-clamp-2 text-sm text-muted-foreground sm:text-base">
                {summary}
              </p>
            )}

            {bookLabel && (
              <div className="space-y-2">
                <p className="flex items-center justify-center gap-2 text-sm sm:justify-start">
                  <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    {currentBook
                      ? t("inProgress.hero.currentBook")
                      : t("inProgress.hero.nextBook")}
                  </span>
                  <span className="line-clamp-1 font-medium">{bookLabel}</span>
                </p>
                {pagePercent !== null && (
                  <div className="mx-auto w-full max-w-md space-y-1.5 sm:mx-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground tabular-nums">
                        {t("home.hero.page", { current: page, total: totalPages })}
                      </span>
                      <span className="tabular-nums">{pagePercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/15">
                      <ProgressFill percent={pagePercent} delay={0.2} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mx-auto w-full max-w-md space-y-2 sm:mx-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium tabular-nums">
                  {t("inProgress.hero.progress", {
                    read: series.booksReadCount,
                    total: series.bookCount,
                  })}
                </span>
                <span className="tabular-nums">{progressPercent}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/15">
                <ProgressFill percent={progressPercent} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
                <Badge variant={almostDone ? "default" : "secondary"}>
                  {t("inProgress.hero.remaining", { count: remainingBooks })}
                </Badge>
                {isFavorite && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 font-semibold text-rose-500">
                    {t("inProgress.card.favoriteBadge")}
                  </span>
                )}
              </div>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
              <Clock className="h-3.5 w-3.5" />
              {t("inProgress.hero.lastReadLabel")}{" "}
              <RelativeTime
                value={item.lastReadAt}
                now={now}
                fallback={t("inProgress.hero.neverRead")}
              />
            </p>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Button asChild size="lg" className="group/cta gap-2 font-semibold">
                <Link href={resumeHref} data-testid="in-progress-hero-resume">
                  {resumeLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={`/series/${series.id}`}>
                  <LibraryBig className="h-4 w-4" />
                  {t("navigation.viewSeries")}
                </Link>
              </Button>
            </div>

            {!nextBook && !currentBook && (
              <p className="text-xs text-muted-foreground">
                {t("inProgress.hero.noBook")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
