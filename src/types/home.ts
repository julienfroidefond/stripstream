import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";

export interface HomePrimaryData {
  ongoing: NormalizedSeries[];
  ongoingBooks: NormalizedBook[];
  onDeck: NormalizedBook[];
  /** Series metadata resolved server-side for the books powering the hero. */
  heroSeries?: NormalizedSeries[];
}
