import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";

export interface HomeData {
  favorites?: NormalizedSeries[];
  ongoing: NormalizedSeries[];
  ongoingBooks: NormalizedBook[];
  recentlyRead: NormalizedBook[];
  onDeck: NormalizedBook[];
  latestSeries: NormalizedSeries[];
}
