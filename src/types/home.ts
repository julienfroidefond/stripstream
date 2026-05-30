import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { StripstreamReadingList } from "@/types/stripstream";

export interface HomeData {
  favorites?: NormalizedSeries[];
  ongoing: NormalizedSeries[];
  ongoingBooks: NormalizedBook[];
  recentlyRead: NormalizedBook[];
  onDeck: NormalizedBook[];
  latestSeries: NormalizedSeries[];
  /** Series metadata resolved server-side for the books powering the hero. */
  heroSeries?: NormalizedSeries[];
  /** Personalised recommendations (Stripstream only). */
  recommendations?: NormalizedSeries[];
  /** Reading lists (Stripstream only). */
  readingLists?: StripstreamReadingList[];
}
