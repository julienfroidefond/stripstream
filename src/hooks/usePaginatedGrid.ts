"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { useGridFlip, useGridFlipPlayback } from "@/components/motion";
import { usePreferences } from "@/contexts/PreferencesContext";
import { normalizeGridPageSize } from "@/lib/collections/page-size";
import { normalizeSortOrder, preferenceForMissingFilter } from "@/lib/collections/query";
import type { SortOrder, UserPreferences } from "@/types/preferences";

export type GridViewMode = "grid" | "list";
type ViewModePreference = "viewMode" | "booksViewMode";

const SEARCH_DEBOUNCE_MS = 300;

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
  /**
   * Masquage des emplacements de tomes manquants (grille d'une série). Ce
   * n'est pas un filtre serveur : l'état reste local, ne touche pas l'URL et
   * persiste la préférence `hideMissingBooks`.
   */
  initialHideMissingBooks?: boolean;
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
  hideMissingBooks: boolean;
  isNavigating: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
  handlePageChange: (page: number) => Promise<void>;
  handlePageSizeChange: (size: number) => Promise<void>;
  handleCompactModeToggle: (nextCompactMode: boolean) => Promise<void>;
  handleViewModeToggle: (nextViewMode: GridViewMode) => Promise<void>;
  handleUnreadFilter: () => Promise<void>;
  handleSearchChange: (term: string) => void;
  handleSortToggle: () => Promise<void>;
  handleMissingToggle: () => Promise<void>;
  handleHideMissingToggle: () => Promise<void>;
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
  initialHideMissingBooks = false,
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
  /** Dernière recherche envoyée dans l'URL par la saisie (voir la resynchro). */
  const [committedSearch, setCommittedSearch] = useState(initialSearch);

  /**
   * Next 16 ne remonte pas la grille quand seuls les search params changent
   * (Précédent/Suivant, lien vers la même page avec d'autres filtres) : les
   * valeurs résolues par le serveur arrivent en nouvelles props. On les
   * réapplique à l'état local quand elles changent (ajustement pendant le
   * rendu, sans effet). Une bascule optimiste n'est pas écrasée : sa prop ne
   * change qu'à la réponse du serveur, qui porte la même valeur. La recherche
   * ignore l'écho de sa propre saisie pour ne pas effacer ce qui a été tapé
   * pendant l'aller-retour.
   */
  const serverState = {
    unread: initialShowOnlyUnread,
    search: initialSearch,
    sort: normalizeSortOrder(initialSort),
    missing: initialHasMissing,
  };
  const [syncedServerState, setSyncedServerState] = useState(serverState);
  if (
    syncedServerState.unread !== serverState.unread ||
    syncedServerState.search !== serverState.search ||
    syncedServerState.sort !== serverState.sort ||
    syncedServerState.missing !== serverState.missing
  ) {
    setSyncedServerState(serverState);
    if (syncedServerState.unread !== serverState.unread) setShowOnlyUnread(serverState.unread);
    if (syncedServerState.sort !== serverState.sort) setSort(serverState.sort);
    if (syncedServerState.missing !== serverState.missing) setShowMissing(serverState.missing);
    if (
      syncedServerState.search !== serverState.search &&
      serverState.search !== committedSearch
    ) {
      setSearchTerm(serverState.search);
      setCommittedSearch(serverState.search);
    }
  }
  const [hideMissingBooks, setHideMissingBooks] = useState(initialHideMissingBooks);
  const [isNavigating, startNavigation] = useTransition();
  const [isSearchPending, startSearchTransition] = useTransition();

  const effectivePageSize = normalizeGridPageSize(pageSize, isCompact);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridFlip = useGridFlip(gridRef);
  const captureLayout = gridFlip.capture;
  // Le masquage local des manquants change le contenu sans changer les données
  // serveur : il fait donc partie de la clé de glissement.
  useGridFlipPlayback(
    gridFlip,
    `${isCompact ? "compact" : "full"}:${hideMissingBooks ? "hide-missing" : "all"}:${contentKey}`
  );

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
      // Le writer applique le rollback ; une préférence non enregistrée ne doit
      // pas bloquer la navigation ni l'état local de la grille.
      await updatePreferences(next);
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
      setCommittedSearch(term.trim() ? term : "");
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
    // Le paramètre reste explicite dans les deux sens : sans lui, le serveur
    // retomberait sur la préférence, dont l'écriture suit la navigation.
    await updateUrlParams({ page: "1", missing: next ? "true" : "false" });
    await persistPreferences({ showMissingBooks: preferenceForMissingFilter(next) });
  }, [captureLayout, showMissing, updateUrlParams, persistPreferences]);

  const handleHideMissingToggle = useCallback(async () => {
    captureLayout();
    const next = !hideMissingBooks;
    setHideMissingBooks(next);
    await persistPreferences({ hideMissingBooks: next });
  }, [captureLayout, hideMissingBooks, persistPreferences]);

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
    hideMissingBooks,
    isNavigating,
    gridRef,
    handlePageChange,
    handlePageSizeChange,
    handleCompactModeToggle,
    handleViewModeToggle,
    handleUnreadFilter,
    handleSearchChange,
    handleSortToggle,
    handleMissingToggle,
    handleHideMissingToggle,
  };
}
