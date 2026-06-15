import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { StripstreamReadingList } from "@/types/stripstream";

export interface HomePrimaryData {
  ongoing: NormalizedSeries[];
  ongoingBooks: NormalizedBook[];
  onDeck: NormalizedBook[];
  /** Series metadata resolved server-side for the books powering the hero. */
  heroSeries?: NormalizedSeries[];
}

export interface HomeDeferredData {
  recentlyRead: NormalizedBook[];
  latestSeries: NormalizedSeries[];
  /** Personalised recommendations (Stripstream only). */
  recommendations?: NormalizedSeries[];
  /** Reading lists (Stripstream only). */
  readingLists?: StripstreamReadingList[];
}

export interface HomeData extends HomePrimaryData, HomeDeferredData {
  favorites?: NormalizedSeries[];
}
