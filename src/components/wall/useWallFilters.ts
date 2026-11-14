"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildStorageKey } from "@/lib/browser/storage";
import {
  filterWallItems,
  isWallItemComplete,
  parseStoredHideRead,
  parseStoredWallLibraries,
} from "@/lib/wall/filter";
import type { WallItem } from "@/types/wall";

export interface WallFilterLibrary {
  name: string;
  count: number;
}

/**
 * Le stockage dont la session a besoin. L'adapter de test remplace
 * `localStorage` et les frames pour piloter l'hydratation pas à pas.
 */
export interface WallFilterStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  requestFrame(callback: () => void): void;
}

const FILTERS_STORAGE_SUFFIX = "wall-libraries";
const HIDE_READ_STORAGE_SUFFIX = "wall-hide-read";

const browserStorage: WallFilterStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  requestFrame: (callback) => {
    window.requestAnimationFrame(() => callback());
  },
};

export interface WallFilterSession {
  libraries: WallFilterLibrary[];
  selectedLibraries: ReadonlySet<string>;
  hideRead: boolean;
  visibleItems: WallItem[];
  visibleLibraryCount: number;
  completedCount: number;
  /** Graine stable de la composition : même filtre, même mur. */
  selectionKey: string;
  panelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
  toggleLibrary: (name: string) => void;
  toggleHideRead: () => void;
  showAllLibraries: () => void;
  showAllItems: () => void;
  /**
   * Vrai quand la prochaine composition vient de la restauration : l'entrée
   * a déjà été jouée par le premier rendu et ne doit pas être rejouée.
   */
  consumeEntranceSkip: () => boolean;
}

interface UseWallFiltersOptions {
  items: readonly WallItem[];
  scope: string;
  language: string;
  storage?: WallFilterStorage;
}

/**
 * Session des filtres du Wall.
 *
 * Elle possède la liste des bibliothèques, la sélection, la préférence
 * « masquer les séries lues », les items visibles, la clé de composition et
 * l'hydratation depuis le stockage. Le composant ne garde que la présentation
 * du panneau et de la plaque.
 */
export function useWallFilters({
  items,
  scope,
  language,
  storage = browserStorage,
}: UseWallFiltersOptions): WallFilterSession {
  const [selectedLibraries, setSelectedLibraries] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [hideRead, setHideRead] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const libraries = useMemo<WallFilterLibrary[]>(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.libraryName, (counts.get(item.libraryName) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (first, second) =>
        first.name.localeCompare(second.name, language, {
          sensitivity: "base",
        })
    );
  }, [items, language]);

  const filtersStorageKey = useMemo(
    () => buildStorageKey(scope, FILTERS_STORAGE_SUFFIX),
    [scope]
  );
  const hideReadStorageKey = useMemo(
    () => buildStorageKey(scope, HIDE_READ_STORAGE_SUFFIX),
    [scope]
  );

  const filtersRestoredRef = useRef(false);
  const filtersHydratedRef = useRef(false);
  const skipEntranceRef = useRef(false);

  useEffect(() => {
    if (filtersRestoredRef.current) return;
    filtersRestoredRef.current = true;

    let storedLibraries: string | null = null;
    let storedHideRead: string | null = null;
    try {
      storedLibraries = storage.getItem(filtersStorageKey);
      storedHideRead = storage.getItem(hideReadStorageKey);
    } catch {
      // Un stockage inaccessible ne doit pas empêcher le mur de s'ouvrir.
      filtersHydratedRef.current = true;
      return;
    }

    const available = new Set(libraries.map((library) => library.name));
    const restoredLibraries = parseStoredWallLibraries(
      storedLibraries,
      available
    );
    const restoredHideRead = parseStoredHideRead(storedHideRead);

    if (restoredLibraries.length === 0 && !restoredHideRead) {
      filtersHydratedRef.current = true;
      return;
    }

    skipEntranceRef.current = true;
    // Volontairement pas d'annulation : en StrictMode, le nettoyage du premier
    // passage annulerait la restauration avant même qu'elle ait eu lieu.
    storage.requestFrame(() => {
      filtersHydratedRef.current = true;
      if (restoredLibraries.length > 0) {
        setSelectedLibraries(new Set(restoredLibraries));
      }
      if (restoredHideRead) setHideRead(true);
    });
  }, [filtersStorageKey, hideReadStorageKey, libraries, storage]);

  // Aucune écriture avant la fin de l'hydratation : un premier rendu ne doit
  // pas écraser les préférences avec les valeurs par défaut.
  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    try {
      storage.setItem(
        filtersStorageKey,
        JSON.stringify([...selectedLibraries].sort())
      );
    } catch {
      // Un stockage plein ou désactivé ne doit pas faire tomber le mur.
    }
  }, [filtersStorageKey, selectedLibraries, storage]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    try {
      storage.setItem(hideReadStorageKey, String(hideRead));
    } catch {
      // Idem : la préférence n'est simplement pas retenue.
    }
  }, [hideRead, hideReadStorageKey, storage]);

  const visibleItems = useMemo(
    () => filterWallItems(items, selectedLibraries, hideRead),
    [hideRead, items, selectedLibraries]
  );

  const visibleLibraryCount = useMemo(
    () => new Set(visibleItems.map((item) => item.libraryName)).size,
    [visibleItems]
  );

  const completedCount = useMemo(
    () =>
      filterWallItems(items, selectedLibraries, false).filter(
        isWallItemComplete
      ).length,
    [items, selectedLibraries]
  );

  const selectionKey = useMemo(() => {
    if (selectedLibraries.size === 0 && !hideRead) return "all";
    return JSON.stringify({
      libraries: [...selectedLibraries].sort(),
      hideRead,
    });
  }, [hideRead, selectedLibraries]);

  const hadVisibleItemsRef = useRef(false);
  useEffect(() => {
    const hadVisibleItems = hadVisibleItemsRef.current;
    hadVisibleItemsRef.current = visibleItems.length > 0;
    if (hadVisibleItems && visibleItems.length === 0) setPanelOpen(false);
  }, [visibleItems.length]);

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => !open);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const toggleLibrary = useCallback((name: string) => {
    setSelectedLibraries((previous) => {
      if (previous.size === 0) return new Set([name]);
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleHideRead = useCallback(() => {
    setHideRead((hidden) => !hidden);
  }, []);

  const showAllLibraries = useCallback(() => {
    setSelectedLibraries(new Set());
  }, []);

  const showAllItems = useCallback(() => {
    setSelectedLibraries(new Set());
    setHideRead(false);
  }, []);

  const consumeEntranceSkip = useCallback(() => {
    if (!skipEntranceRef.current) return false;
    skipEntranceRef.current = false;
    return true;
  }, []);

  return {
    libraries,
    selectedLibraries,
    hideRead,
    visibleItems,
    visibleLibraryCount,
    completedCount,
    selectionKey,
    panelOpen,
    togglePanel,
    closePanel,
    toggleLibrary,
    toggleHideRead,
    showAllLibraries,
    showAllItems,
    consumeEntranceSkip,
  };
}
