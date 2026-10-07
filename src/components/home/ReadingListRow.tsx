"use client";

import { memo, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookMarked } from "lucide-react";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { cn } from "@/lib/utils";
import type { StripstreamReadingList } from "@/types/stripstream";
import { loadHomeFeed } from "@/app/actions/home";

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
      headerClassName="border-b border-border/50 pb-2"
    >
      <ScrollContainer
        showArrows={true}
        scrollAmount={400}
        arrowLeftLabel={t("navigation.scrollLeft")}
        arrowRightLabel={t("navigation.scrollRight")}
      >
        {loadedLists.map((list) => (
          <ReadingListCard
            key={list.id}
            list={list}
            onClick={handleOpenList}
          />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className="flex min-h-[282px] w-[150px] flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-foreground sm:min-h-[300px]"
          >
            {isPending ? t("navigation.loading") : t("navigation.loadMore")}
          </button>
        )}
      </ScrollContainer>
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
  const firstCover = list.preview_covers[0];
  const isCompleted =
    !isAnonymous && list.book_count > 0 && list.books_read_count >= list.book_count;

  return (
    <button
      type="button"
      data-testid={`home-reading-list-${list.id}`}
      onClick={() => onClick(list.id)}
      className={cn(
        "group relative flex w-[160px] flex-shrink-0 flex-col gap-1.5 transition-opacity sm:w-[188px]",
        isCompleted && "opacity-70"
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        {firstCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/stripstream/images/books/${firstCover}/thumbnail`}
            alt={list.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <BookMarked className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="line-clamp-2 text-left text-xs font-semibold text-white">{list.name}</p>
        </div>
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
