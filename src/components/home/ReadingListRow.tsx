"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Bookmark } from "lucide-react";
import { ReadingListCard } from "@/components/reading-lists/ReadingListCard";
import { ReadingListCoverStack } from "@/components/reading-lists/ReadingListCoverStack";
import { useSpotlightStaging } from "@/components/ui/spotlight-carousel";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { useCoverInteraction } from "@/hooks/useCoverInteraction";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { StripstreamAdapter } from "@/lib/providers/stripstream/stripstream.adapter";
import type { StripstreamReadingList } from "@/types/stripstream";
import { FeedRow } from "@/components/home/FeedRow";
import { CountUp, Magnetic, ProgressFill } from "@/components/motion";

interface ReadingListRowProps {
  lists: StripstreamReadingList[];
}

function getReadingListStatus(
  list: StripstreamReadingList
): "unread" | "reading" | "read" {
  if (list.book_count > 0 && list.books_read_count >= list.book_count) return "read";
  if (list.books_read_count > 0) return "reading";
  return "unread";
}

export function ReadingListRow({ lists }: ReadingListRowProps) {
  const router = useRouter();

  const handleOpenList = useCallback(
    (id: string) => {
      router.push(`/reading-lists/${id}`);
    },
    [router]
  );

  return (
    <FeedRow
      titleKey="home.sections.reading_lists"
      icon={Bookmark}
      initialItems={lists}
      feed="reading-lists"
      testId="home-reading-lists"
      viewModeKey="home-reading-lists-view-mode"
      getKey={(list) => list.id}
      renderCard={(list) => (
        <div className="w-[160px] sm:w-[188px]">
          <ReadingListCard
            list={list}
            status={getReadingListStatus(list)}
            testId={`home-reading-list-${list.id}`}
          />
        </div>
      )}
      renderSlide={(list) => ({
        backdropSrc: StripstreamAdapter.resolveReadingListPreviewCover(list.preview_covers?.[0]),
        content: <ReadingListSpotlightSlide list={list} onOpen={handleOpenList} />,
      })}
    />
  );
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
  const { active, handlers } = useCoverInteraction<HTMLButtonElement>();

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
      <div className="mx-auto shrink-0 sm:mx-0">
        <button
          type="button"
          onClick={() => onOpen(list.id)}
          {...staging.cover}
          {...handlers}
          className="group relative block w-[168px] focus-visible:outline-hidden sm:w-[196px]"
          aria-label={t("navigation.openReadingList")}
        >
          <ReadingListCoverStack covers={list.preview_covers} active={active} />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 rounded-[2px_6px_6px_2px] opacity-0 ring-2 ring-ring ring-offset-2 ring-offset-background transition-opacity duration-150 group-focus-visible:opacity-100"
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
