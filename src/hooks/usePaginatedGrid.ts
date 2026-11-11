"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { useGridFlip, useGridFlipPlayback } from "@/components/motion";
import { usePreferences } from "@/contexts/PreferencesContext";
import { normalizeGridPageSize } from "@/lib/pageSize";
import logger from "@/lib/logger";
import type { SortOrder, UserPreferences } from "@/types/preferences";

export type GridViewMode = "grid" | "list";
type ViewModePreference = "viewMode" | "booksViewMode";

const SEARCH_DEBOUNCE_MS = 300;

function normalizeSortOrder(value: string | undefined): SortOrder {
  return value === "latest" || value === "community_score" ? value : "title";
}

interface UsePaginatedGridOptions {
  /** Identité du contenu affiché : sa variation rejoue le glissement des cartes. */
  contentKey: string;
  /** Filtre unread résolu côté serveur (URL ou préférence). */
  showOnlyUnread: boolean;
  /** Valeur appliquée quand l'URL ne porte encore aucun filtre unread. */
  defaultShowOnlyUnread: boolean;
  pageSize: number;
  initialCompact: boolean;
  initialViewMode: GridViewMode;
  /** Champ de préférence où persister le mode d'affichage de cette grille. */
  viewModePreference: ViewModePreference;
  /** Recherche déjà présente dans l'URL. */
  initialSearch?: string;
  /** Tri déjà résolu côté serveur. */
  initialSort?: string;
  /** Active le tri par note communautaire dans le cycle du bouton. */
  canSortByRating?: boolean;
  /** Filtre « tomes manquants » déjà résolu côté serveur. */
  initialHasMissing?: boolean;
}

export interface PaginatedGridController {
  effectivePageSize: number;
  isCompact: boolean;
  viewMode: GridViewMode;
  showOnlyUnread: boolean;
  searchTerm: string;
  isSearchPending: boolean;
  sort: SortOrder;
  showMissing: boolean;
  isNavigating: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
  /** Mémorise la position des cartes avant une action de mise en page. */
  captureLayout: () => void;
  updateUrlParams: (
    updates: Record<string, string | null>,
    replace?: boolean,
    options?: { dim?: boolean }
  ) => Promise<void>;
  /** Écrit des préférences typées via le contexte, sans interrompre l'action. */
  persistPreferences: (next: Partial<UserPreferences>) => Promise<void>;
  handlePageChange: (page: number) => Promise<void>;
  handlePageSizeChange: (size: number) => Promise<void>;
  handleCompactModeToggle: (nextCompactMode: boolean) => Promise<void>;
  handleViewModeToggle: (nextViewMode: GridViewMode) => Promise<void>;
  handleUnreadFilter: () => Promise<void>;
  handleSearchChange: (term: string) => void;
  handleSortToggle: () => Promise<void>;
  handleMissingToggle: () => Promise<void>;
}

function viewModePatch(
  preference: ViewModePreference,
  mode: GridViewMode
): Partial<UserPreferences["displayMode"]> {
  return preference === "booksViewMode" ? { booksViewMode: mode } : { viewMode: mode };
}

/**
 * Contrôleur unique des grilles paginées (séries d'une bibliothèque, tomes
 * d'une série).
 *
 * Il possède l'état d'URL, le filtre unread par défaut, la transition et
 * l'atténuation pendant la navigation, la clé de glissement et les préférences
 * d'affichage typées. Les grilles ne fournissent que leurs données, leur clé de
 * contenu et le rendu de leurs cartes.
 */
export function usePaginatedGrid({
  contentKey,
  showOnlyUnread: initialShowOnlyUnread,
  defaultShowOnlyUnread,
  pageSize,
  initialCompact,
  initialViewMode,
  viewModePreference,
  initialSearch = "",
  initialSort,
  canSortByRating = false,
  initialHasMissing = false,
}: UsePaginatedGridOptions): PaginatedGridController {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { preferences, updatePreferences } = usePreferences();

  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const [isCompact, setIsCompact] = useState(initialCompact);
  const [viewMode, setViewMode] = useState<GridViewMode>(initialViewMode);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sort, setSort] = useState<SortOrder>(() => normalizeSortOrder(initialSort));
  const [showMissing, setShowMissing] = useState(initialHasMissing);
  const [isNavigating, startNavigation] = useTransition();
  const [isSearchPending, startSearchTransition] = useTransition();

  const effectivePageSize = normalizeGridPageSize(pageSize, isCompact);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridFlip = useGridFlip(gridRef);
  const captureLayout = gridFlip.capture;
  useGridFlipPlayback(gridFlip, `${isCompact ? "compact" : "full"}:${contentKey}`);

  /**
   * Le debounce et les actions lisent les paramètres au moment du
   * déclenchement : un rendu intermédiaire ne doit pas figer une URL périmée.
   */
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const updateUrlParams = useCallback(
    async (
      updates: Record<string, string | null>,
      replace: boolean = false,
      { dim = true }: { dim?: boolean } = {}
    ) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      if (replace) {
        await router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      } else {
        const navigate = () => router.push(`${pathname}?${params.toString()}`, { scroll: false });
        // La grille ne s'atténue que si son contenu va être remplacé ; un
        // changement de mise en page (compact, taille) glisse directement.
        if (dim) startNavigation(navigate);
        else navigate();
      }
    },
    [router, pathname]
  );

  const persistPreferences = useCallback(
    async (next: Partial<UserPreferences>) => {
      try {
        await updatePreferences(next);
      } catch (error) {
        // Une préférence non enregistrée ne doit pas bloquer la navigation.
        logger.error({ err: error }, "Erreur lors de la sauvegarde des préférences");
      }
    },
    [updatePreferences]
  );

  const persistDisplayMode = useCallback(
    async (patch: Partial<UserPreferences["displayMode"]>) => {
      await persistPreferences({
        displayMode: { ...preferences.displayMode, ...patch },
      });
    },
    [persistPreferences, preferences.displayMode]
  );

  // Applique le filtre unread par défaut au premier chargement.
  useEffect(() => {
    if (defaultShowOnlyUnread && !searchParams.has("unread")) {
      updateUrlParams({ page: "1", unread: "true" }, true);
    }
  }, [defaultShowOnlyUnread, updateUrlParams, searchParams]);

  const handlePageChange = useCallback(
    async (page: number) => {
      await updateUrlParams({ page: page.toString() });
    },
    [updateUrlParams]
  );

  const handleUnreadFilter = useCallback(async () => {
    captureLayout();
    const next = !showOnlyUnread;
    setShowOnlyUnread(next);
    await updateUrlParams({ page: "1", unread: next ? "true" : "false" });
    await persistPreferences({ showOnlyUnread: next });
  }, [captureLayout, showOnlyUnread, updateUrlParams, persistPreferences]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitSearch = useCallback(
    (term: string) => {
      startSearchTransition(() => {
        void updateUrlParams(
          { page: "1", search: term.trim() ? term : null },
          true
        );
      });
    },
    [updateUrlParams]
  );

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => commitSearch(term), SEARCH_DEBOUNCE_MS);
    },
    [commitSearch]
  );

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    []
  );

  const handleSortToggle = useCallback(async () => {
    captureLayout();
    // Cycle : title → latest → (community_score si Stripstream) → title
    const nextSort: SortOrder = (() => {
      if (sort === "title") return "latest";
      if (sort === "latest") return canSortByRating ? "community_score" : "title";
      return "title";
    })();
    setSort(nextSort);
    await updateUrlParams({ page: "1", sort: nextSort === "title" ? null : nextSort });
    await persistPreferences({ defaultSortOrder: nextSort });
  }, [captureLayout, sort, canSortByRating, updateUrlParams, persistPreferences]);

  const handleMissingToggle = useCallback(async () => {
    captureLayout();
    const next = !showMissing;
    setShowMissing(next);
    await updateUrlParams({ page: "1", missing: next ? "true" : null });
    await persistPreferences({ showMissingBooks: next });
  }, [captureLayout, showMissing, updateUrlParams, persistPreferences]);

  const handlePageSizeChange = useCallback(
    async (size: number) => {
      captureLayout();
      const nextSize = normalizeGridPageSize(size, isCompact);
      await updateUrlParams({ page: "1", size: nextSize.toString() }, false, { dim: false });
      await persistDisplayMode({ itemsPerPage: nextSize });
    },
    [captureLayout, isCompact, persistDisplayMode, updateUrlParams]
  );

  const handleCompactModeToggle = useCallback(
    async (nextCompactMode: boolean) => {
      captureLayout();
      setIsCompact(nextCompactMode);

      const nextSize = normalizeGridPageSize(effectivePageSize, nextCompactMode);
      if (nextSize !== effectivePageSize) {
        await updateUrlParams({ page: "1", size: nextSize.toString() }, false, { dim: false });
      }

      await persistDisplayMode({
        compact: nextCompactMode,
        itemsPerPage: nextSize,
        ...viewModePatch(viewModePreference, viewMode),
      });
    },
    [
      captureLayout,
      effectivePageSize,
      persistDisplayMode,
      updateUrlParams,
      viewMode,
      viewModePreference,
    ]
  );

  const handleViewModeToggle = useCallback(
    async (nextViewMode: GridViewMode) => {
      setViewMode(nextViewMode);
      await persistDisplayMode(viewModePatch(viewModePreference, nextViewMode));
    },
    [persistDisplayMode, viewModePreference]
  );

  return {
    effectivePageSize,
    isCompact,
    viewMode,
    showOnlyUnread,
    searchTerm,
    isSearchPending,
    sort,
    showMissing,
    isNavigating,
    gridRef,
    captureLayout,
    updateUrlParams,
    persistPreferences,
    handlePageChange,
    handlePageSizeChange,
    handleCompactModeToggle,
    handleViewModeToggle,
    handleUnreadFilter,
    handleSearchChange,
    handleSortToggle,
    handleMissingToggle,
  };
}
