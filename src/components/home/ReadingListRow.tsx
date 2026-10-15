"use client";

import { memo, useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookMarked } from "lucide-react";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { cn } from "@/lib/utils";
import type { StripstreamReadingList } from "@/types/stripstream";
import { loadHomeFeed } from "@/app/actions/home";
import { GlowLayer, StaggerGroup, StaggerItem, usePointerGlow } from "@/components/motion";

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
    >
      <StaggerGroup stagger={0.045}>
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
                className="flex min-h-[282px] w-[150px] items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:min-h-[300px]"
              >
                {isPending ? t("navigation.loading") : t("navigation.loadMore")}
              </button>
            </StaggerItem>
          )}
        </ScrollContainer>
      </StaggerGroup>
    </Section>
  );
}

interface ReadingListCardProps {
  list: StripstreamReadingList;
  onClick: (id: string) => void;
}

const ReadingListCard = memo(function ReadingListCard({ list, onClick }: ReadingListCardProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const glowRef = useRef<HTMLButtonElement>(null);
  const handleGlow = usePointerGlow(glowRef);
  const firstCover = list.preview_covers[0];
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
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 transition-transform duration-300 ease-out group-hover:-translate-y-1">
        {firstCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/stripstream/images/books/${firstCover}/thumbnail`}
            alt={list.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
            <BookMarked className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

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
