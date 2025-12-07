import type { KomgaBook, KomgaSeries } from "./komga";

export interface HomeData {
  ongoing: KomgaSeries[];
  ongoingBooks: KomgaBook[];
  recentlyRead: KomgaBook[];
  onDeck: KomgaBook[];
  latestSeries: KomgaSeries[];
}
