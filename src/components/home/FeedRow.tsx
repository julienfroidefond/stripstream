"use client";

import { useCallback, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { loadHomeFeed } from "@/app/actions/home";
import type { HomeFeed, HomeFeedItem } from "@/lib/home/feed-page";
import { useFeedPagination } from "@/hooks/useFeedPagination";
import {
  useCarouselViewMode,
  type CarouselViewMode,
} from "@/hooks/useCarouselViewMode";
import { useTranslate } from "@/hooks/useTranslate";
import { HOME_FEED_PAGE_SIZE } from "@/constants/homeConstants";
import { Button } from "@/components/ui/button";
import { CarouselViewToggle } from "@/components/ui/carousel-view-toggle";
import { LoadMoreLabel } from "@/components/ui/load-more-label";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { SpotlightCarousel } from "@/components/ui/spotlight-carousel";
import { StaggerGroup, StaggerItem } from "@/components/motion";

/** Contenu d'une diapositive spotlight fourni par la rangée. */
export interface FeedRowSlide {
  backdropSrc?: string | null;
  content: ReactNode;
}

interface FeedRowProps<F extends HomeFeed> {
  titleKey: string;
  icon?: LucideIcon;
  initialItems: readonly HomeFeedItem<F>[];
  /** Force `hasMore` quand la première page vient d'un chargement client. */
  initialHasMore?: boolean;
  feed: F;
  viewModeKey: string;
  defaultViewMode?: CarouselViewMode;
  getKey: (item: HomeFeedItem<F>) => string;
  renderSlide: (item: HomeFeedItem<F>) => FeedRowSlide;
  renderCard: (item: HomeFeedItem<F>) => ReactNode;
  testId?: string;
  featuredHeader?: boolean;
}

/**
 * Coque commune des rangées de l'accueil.
 *
 * Elle possède la pagination, l'état de chargement, l'en-tête, la bascule
 * rail/spotlight et le pied « Voir plus ». Chaque rangée ne fournit que son
 * flux, ses clés et les rendus d'une carte et d'une diapositive.
 */
export function FeedRow<F extends HomeFeed>({
  titleKey,
  icon,
  initialItems,
  initialHasMore,
  feed,
  viewModeKey,
  defaultViewMode,
  getKey,
  renderSlide,
  renderCard,
  testId,
  featuredHeader = false,
}: FeedRowProps<F>) {
  const { t } = useTranslate();
  const { viewMode, toggleViewMode } = useCarouselViewMode(viewModeKey, {
    defaultMode: defaultViewMode,
  });

  const loadPage = useCallback(
    (offset: number) => loadHomeFeed(feed, offset),
    [feed]
  );

  const { items, hasMore, isPending, loadMore } = useFeedPagination<
    HomeFeedItem<F>
  >({
    initialItems,
    initialHasMore,
    pageSize: HOME_FEED_PAGE_SIZE,
    loadPage,
  });

  if (items.length === 0) return null;

  const title = t(titleKey);

  return (
    <Section
      data-testid={testId}
      title={title}
      icon={icon}
      className="space-y-5"
      headerClassName="pb-1"
      titleClassName={featuredHeader ? "text-primary" : undefined}
      iconClassName={featuredHeader ? "text-primary" : undefined}
      actions={<CarouselViewToggle viewMode={viewMode} onToggle={toggleViewMode} />}
    >
      {viewMode === "spotlight" ? (
        <SpotlightCarousel
          ariaLabel={title}
          slides={items.map((item) => ({
            key: getKey(item),
            ...renderSlide(item),
          }))}
          footer={
            hasMore ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
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
            {items.map((item) => (
              <StaggerItem key={getKey(item)} className="shrink-0">
                {renderCard(item)}
              </StaggerItem>
            ))}
            {hasMore && (
              <StaggerItem className="shrink-0">
                <button
                  type="button"
                  onClick={loadMore}
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
