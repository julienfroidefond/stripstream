"use client";

import { memo, useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Bookmark } from "lucide-react";
import { ReadingListCover } from "@/components/reading-lists/ReadingListCover";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { LoadMoreLabel } from "@/components/ui/load-more-label";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { CarouselViewToggle } from "@/components/ui/carousel-view-toggle";
import { SpotlightCarousel, useSpotlightStaging } from "@/components/ui/spotlight-carousel";
import { useTranslate } from "@/hooks/useTranslate";
import { useCarouselViewMode } from "@/hooks/useCarouselViewMode";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { StripstreamAdapter } from "@/lib/providers/stripstream/stripstream.adapter";
import { cn } from "@/lib/utils";
import type { StripstreamReadingList } from "@/types/stripstream";
import { loadHomeFeed } from "@/app/actions/home";
import {
  CountUp,
  GlowLayer,
  Magnetic,
  ProgressFill,
  StaggerGroup,
  StaggerItem,
  usePointerGlow,
} from "@/components/motion";

interface ReadingListRowProps {
  lists: StripstreamReadingList[];
}

const ITEMS_PER_PAGE = 8;

export function ReadingListRow({ lists }: ReadingListRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const [loadedLists, setLoadedLists] = useState(lists.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(lists.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();
  const { viewMode, toggleViewMode } = useCarouselViewMode("home-reading-lists-view-mode");

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadHomeFeed("reading-lists", loadedLists.length);
      setLoadedLists(result.items as StripstreamReadingList[]);
      setHasMore(result.hasMore);
    });
  };

  const handleOpenList = useCallback(
    (id: string) => {
      router.push(`/reading-lists/${id}`);
    },
    [router]
  );

  if (!lists.length) return null;

  return (
    <Section
      data-testid="home-reading-lists"
      title={t("home.sections.reading_lists")}
      icon={Bookmark}
      className="space-y-5"
      headerClassName="pb-1"
      actions={<CarouselViewToggle viewMode={viewMode} onToggle={toggleViewMode} />}
    >
      {viewMode === "spotlight" ? (
        <SpotlightCarousel
          ariaLabel={t("home.sections.reading_lists")}
          slides={loadedLists.map((list) => ({
            key: list.id,
            backdropSrc: StripstreamAdapter.resolveReadingListPreviewCover(list.preview_covers?.[0]),
            content: <ReadingListSpotlightSlide list={list} onOpen={handleOpenList} />,
          }))}
          footer={
            hasMore ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isPending}
                aria-busy={isPending}
                className="disabled:opacity-100"
              >
                <LoadMoreLabel
                  pending={isPending}
                  label={t("navigation.loadMore")}
                  loadingLabel={t("navigation.loading")}
                />
              </Button>
            ) : undefined
          }
        />
      ) : (
        <StaggerGroup stagger={0.05} effect="deal" amount={0.25}>
          <ScrollContainer
            showArrows={true}
            scrollAmount={400}
            arrowLeftLabel={t("navigation.scrollLeft")}
            arrowRightLabel={t("navigation.scrollRight")}
          >
            {loadedLists.map((list) => (
              <StaggerItem key={list.id} className="shrink-0">
                <ReadingListCard list={list} onClick={handleOpenList} />
              </StaggerItem>
            ))}
            {hasMore && (
              <StaggerItem className="shrink-0">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isPending}
                  aria-busy={isPending}
                  className="flex min-h-[282px] w-[150px] items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:min-h-[300px]"
                >
                  <LoadMoreLabel
                  pending={isPending}
                  label={t("navigation.loadMore")}
                  loadingLabel={t("navigation.loading")}
                />
                </button>
              </StaggerItem>
            )}
          </ScrollContainer>
        </StaggerGroup>
      )}
    </Section>
  );
}

interface ReadingListCardProps {
  list: StripstreamReadingList;
  onClick: (id: string) => void;
}

const ReadingListSpotlightSlide = memo(function ReadingListSpotlightSlide({
  list,
  onOpen,
}: {
  list: StripstreamReadingList;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const hasProgress =
    !isAnonymous && list.book_count > 0 && list.books_read_count > 0;
  const percent = hasProgress
    ? Math.min(100, Math.round((list.books_read_count / list.book_count) * 100))
    : 0;
  const description = list.description?.trim() || null;

  const staging = useSpotlightStaging();

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
      {/* L'enveloppe fixe capte le survol, le bouton seul se soulève. */}
      <div className="group mx-auto shrink-0 sm:mx-0">
        <button
          type="button"
          onClick={() => onOpen(list.id)}
          {...staging.cover}
          className="relative block aspect-2/3 w-[168px] overflow-hidden rounded-xl bg-surface-2 sm:w-[196px] transition-transform duration-350 ease-out group-hover:-translate-y-2.5 group-hover:-rotate-2 group-hover:scale-104 motion-reduce:transition-none motion-reduce:group-hover:translate-none motion-reduce:group-hover:rotate-none motion-reduce:group-hover:scale-none"
          aria-label={t("navigation.openReadingList")}
        >
          <ReadingListCover
            covers={list.preview_covers}
            alt={list.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-projection group-hover:scale-[1.07] motion-reduce:transition-none"
            placeholderClassName="bg-surface-2"
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 text-center text-foreground sm:text-left">
        <div
          className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start"
          {...staging.item}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {t("navigation.readingListLabel")}
        </div>

        <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          <span className="inline-block" {...staging.title}>{list.name}</span>
        </h2>

        <p
          className="text-sm text-muted-foreground sm:text-base"
          {...staging.item}
        >
          {t("home.reading_lists.series_count", { count: list.series_count })}
        </p>

        {description && (
          <p
            className="line-clamp-2 text-sm text-muted-foreground sm:text-base"
            {...staging.item}
          >
            {description}
          </p>
        )}

        {hasProgress && (
          <div className="mx-auto w-full max-w-md space-y-2 sm:mx-0" {...staging.item}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
              <ProgressFill percent={percent} />
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              <span className="font-semibold text-foreground tabular-nums">
                <CountUp value={percent} suffix="%" />
              </span>
              <span className="tabular-nums">
                {t("series.header.status.progress", {
                  read: list.books_read_count,
                  total: list.book_count,
                })}
              </span>
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-center sm:justify-start" {...staging.item}>
          <Magnetic>
            <Button
              onClick={() => onOpen(list.id)}
              size="lg"
              className="group/cta gap-2 font-semibold"
            >
              {t("navigation.openReadingList")}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
            </Button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
});

const ReadingListCard = memo(function ReadingListCard({ list, onClick }: ReadingListCardProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const glowRef = useRef<HTMLButtonElement>(null);
  const handleGlow = usePointerGlow(glowRef);
  const isCompleted =
    !isAnonymous && list.book_count > 0 && list.books_read_count >= list.book_count;

  return (
    <button
      type="button"
      ref={glowRef}
      onMouseMove={handleGlow}
      data-testid={`home-reading-list-${list.id}`}
      onClick={() => onClick(list.id)}
      className={cn(
        "group relative flex w-[160px] shrink-0 flex-col gap-1.5 sm:w-[188px]",
        isCompleted && "opacity-70"
      )}
    >
      {/* Cover */}
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 transition-[translate,box-shadow] duration-500 ease-projection group-hover:-translate-y-2 group-hover:ring-border motion-reduce:transition-none">
        <ReadingListCover
          covers={list.preview_covers}
          alt={list.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-projection group-hover:scale-[1.07] motion-reduce:transition-none"
          placeholderClassName="bg-surface-2"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">{/* taste-skill-ignore: scrim neutre au-dessus de la couverture */}
          <p className="line-clamp-2 text-left text-xs font-semibold text-white">{list.name}</p>
        </div>

        <GlowLayer />
      </div>

      {/* Title + count */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="line-clamp-1 text-left text-sm font-medium leading-tight">{list.name}</p>
        <p className="text-left text-[11px] text-muted-foreground">
          {t("home.reading_lists.series_count", { count: list.series_count })}
        </p>
      </div>
    </button>
  );
});
