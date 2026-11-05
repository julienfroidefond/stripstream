import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";

export interface BaseCoverProps {
  alt?: string;
  className?: string;
  quality?: number;
  sizes?: string;
  showProgressUi?: boolean;
  /** Couverture immédiatement visible : chargement prioritaire et watchdog. */
  eager?: boolean;
  /** Indication au navigateur pour arbitrer les requêtes d'image. */
  fetchPriority?: "high" | "low" | "auto";
}

export interface BookCoverProps extends BaseCoverProps {
  book: NormalizedBook;
  onSuccess?: (book: NormalizedBook, action: "read" | "unread") => void;
  showControls?: boolean;
  showOverlay?: boolean;
  overlayVariant?: "default" | "home";
}

export interface SeriesCoverProps extends BaseCoverProps {
  series: NormalizedSeries;
  isAnonymous?: boolean;
  /**
   * Réduit l'opacité des séries entièrement lues. La page « Mes notes » ne
   * contient que des séries lues : elle le désactive pour éviter une grille
   * entièrement grisée.
   */
  dimCompleted?: boolean;
}
