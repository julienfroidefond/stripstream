"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { addToFavorites, removeFromFavorites } from "@/app/actions/favorites";
import { shelveSeries, unshelveSeries } from "@/app/actions/series-shelf";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import logger from "@/lib/logger";
import type { NormalizedSeries } from "@/lib/providers/types";
import { emitFavoriteChange } from "@/lib/series/favorite-events";
import { ReadProgressMutationsProvider } from "./ReadProgressMutationsContext";

export interface ShelfMutationOptions {
  /** Affiche l'action « Annuler » après une mise de côté réussie. */
  undo?: boolean;
}

type FavoriteMutation = (
  series: NormalizedSeries,
  currentValue: boolean
) => Promise<boolean | null>;

type ShelfMutation = (
  series: NormalizedSeries,
  shelved: boolean,
  options?: ShelfMutationOptions
) => Promise<boolean | null>;

interface OptimisticValue {
  value: boolean;
  /** Valeur serveur au moment du toggle, pour savoir quand elle est périmée. */
  serverValue: boolean;
}

export interface SeriesMutations {
  isFavorite: (seriesId: string, serverValue: boolean) => boolean;
  isShelved: (seriesId: string, serverValue: boolean) => boolean;
  isFavoritePending: (seriesId: string) => boolean;
  isShelfPending: (seriesId: string) => boolean;
  toggleFavorite: FavoriteMutation;
  setShelf: ShelfMutation;
}

interface SeriesMutationsContextValue extends SeriesMutations {
  favoriteOverrides: ReadonlyMap<string, OptimisticValue>;
}

const SeriesMutationsContext = createContext<
  SeriesMutationsContextValue | undefined
>(undefined);

function resolveOptimistic(
  overrides: ReadonlyMap<string, OptimisticValue>,
  seriesId: string,
  serverValue: boolean
): boolean {
  const override = overrides.get(seriesId);
  if (!override || override.serverValue !== serverValue) return serverValue;
  return override.value;
}

function withOverride(
  overrides: ReadonlyMap<string, OptimisticValue>,
  seriesId: string,
  value: OptimisticValue | null
): Map<string, OptimisticValue> {
  const next = new Map(overrides);
  if (value) next.set(seriesId, value);
  else next.delete(seriesId);
  return next;
}

function withPending(
  pending: ReadonlySet<string>,
  seriesId: string,
  value: boolean
): Set<string> {
  const next = new Set(pending);
  if (value) next.add(seriesId);
  else next.delete(seriesId);
  return next;
}

/**
 * L'unique protocole de mutation favori / mise de côté.
 *
 * Les surfaces lisent l'état via `isFavorite` / `isShelved`, appellent une
 * seule méthode et ne connaissent ni les actions serveur, ni le rollback, ni
 * le toast, ni l'événement de la sidebar. Une mutation réussie déclenche un
 * seul `router.refresh()`.
 */
export function SeriesMutationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslate();
  const { toast } = useToast();

  const [favoriteOverrides, setFavoriteOverrides] = useState<
    ReadonlyMap<string, OptimisticValue>
  >(() => new Map());
  const [shelfOverrides, setShelfOverrides] = useState<
    ReadonlyMap<string, OptimisticValue>
  >(() => new Map());
  const favoritePendingRef = useRef(new Set<string>());
  const shelfPendingRef = useRef(new Set<string>());
  const [favoritePending, setFavoritePending] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [shelfPending, setShelfPending] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const markFavoritePending = useCallback(
    (seriesId: string, pending: boolean) => {
      favoritePendingRef.current = withPending(
        favoritePendingRef.current,
        seriesId,
        pending
      );
      setFavoritePending(favoritePendingRef.current);
    },
    []
  );

  const markShelfPending = useCallback((seriesId: string, pending: boolean) => {
    shelfPendingRef.current = withPending(
      shelfPendingRef.current,
      seriesId,
      pending
    );
    setShelfPending(shelfPendingRef.current);
  }, []);

  const isFavorite = useCallback(
    (seriesId: string, serverValue: boolean) =>
      resolveOptimistic(favoriteOverrides, seriesId, serverValue),
    [favoriteOverrides]
  );

  const isShelved = useCallback(
    (seriesId: string, serverValue: boolean) =>
      resolveOptimistic(shelfOverrides, seriesId, serverValue),
    [shelfOverrides]
  );

  const isFavoritePending = useCallback(
    (seriesId: string) => favoritePending.has(seriesId),
    [favoritePending]
  );

  const isShelfPending = useCallback(
    (seriesId: string) => shelfPending.has(seriesId),
    [shelfPending]
  );

  const toggleFavorite = useCallback<FavoriteMutation>(
    async (series, currentValue) => {
      if (favoritePendingRef.current.has(series.id)) return null;

      const nextValue = !currentValue;
      setFavoriteOverrides((current) =>
        withOverride(current, series.id, {
          value: nextValue,
          serverValue: currentValue,
        })
      );
      markFavoritePending(series.id, true);

      try {
        const result = nextValue
          ? await addToFavorites(series.id)
          : await removeFromFavorites(series.id);

        if (!result.success) {
          setFavoriteOverrides((current) =>
            withOverride(current, series.id, null)
          );
          toast({
            variant: "destructive",
            title: t("seriesMutations.favorite.error"),
            description: result.message,
          });
          return null;
        }

        emitFavoriteChange({
          seriesId: series.id,
          action: nextValue ? "add" : "remove",
          ...(nextValue ? { series } : {}),
        });
        toast({
          title: t(
            nextValue
              ? "seriesMutations.favorite.added"
              : "seriesMutations.favorite.removed"
          ),
          description: series.name,
        });
        router.refresh();
        return nextValue;
      } catch (error) {
        setFavoriteOverrides((current) =>
          withOverride(current, series.id, null)
        );
        logger.error(
          { err: error },
          "Erreur lors de la modification des favoris:"
        );
        toast({
          variant: "destructive",
          title: t("seriesMutations.favorite.error"),
          description: series.name,
        });
        return null;
      } finally {
        markFavoritePending(series.id, false);
      }
    },
    [markFavoritePending, router, t, toast]
  );

  const shelfMutationRef = useRef<ShelfMutation | null>(null);

  const setShelf = useCallback<ShelfMutation>(
    async (series, shelved, options = {}) => {
      if (shelfPendingRef.current.has(series.id)) return null;

      setShelfOverrides((current) =>
        withOverride(current, series.id, {
          value: shelved,
          serverValue: !shelved,
        })
      );
      markShelfPending(series.id, true);

      try {
        const result = shelved
          ? await shelveSeries(series.id, series.libraryId)
          : await unshelveSeries(series.id, series.libraryId);

        if (!result.success) {
          setShelfOverrides((current) =>
            withOverride(current, series.id, null)
          );
          toast({
            variant: "destructive",
            title: t("seriesMutations.shelf.error"),
            description: result.message,
          });
          return null;
        }

        toast({
          title: t(
            shelved
              ? "seriesMutations.shelf.shelved"
              : "seriesMutations.shelf.resumed"
          ),
          description: series.name,
          action:
            shelved && options.undo ? (
              <ToastAction
                altText={t("seriesMutations.shelf.undo")}
                onClick={() => void shelfMutationRef.current?.(series, false)}
              >
                {t("seriesMutations.shelf.undo")}
              </ToastAction>
            ) : undefined,
        });
        router.refresh();
        return shelved;
      } catch (error) {
        setShelfOverrides((current) => withOverride(current, series.id, null));
        logger.error(
          { err: error },
          "Erreur lors de la modification de la mise de côté:"
        );
        toast({
          variant: "destructive",
          title: t("seriesMutations.shelf.error"),
          description: series.name,
        });
        return null;
      } finally {
        markShelfPending(series.id, false);
      }
    },
    [markShelfPending, router, t, toast]
  );

  useEffect(() => {
    shelfMutationRef.current = setShelf;
  }, [setShelf]);

  const contextValue = useMemo<SeriesMutationsContextValue>(
    () => ({
      favoriteOverrides,
      isFavorite,
      isShelved,
      isFavoritePending,
      isShelfPending,
      toggleFavorite,
      setShelf,
    }),
    [
      favoriteOverrides,
      isFavorite,
      isShelved,
      isFavoritePending,
      isShelfPending,
      toggleFavorite,
      setShelf,
    ]
  );

  return (
    <SeriesMutationsContext.Provider value={contextValue}>
      {/* La progression de lecture a son propre seam ; il est monté ici pour
          que toute surface sous la racine des mutations client y ait accès. */}
      <ReadProgressMutationsProvider>{children}</ReadProgressMutationsProvider>
    </SeriesMutationsContext.Provider>
  );
}

function useSeriesMutationsContext(): SeriesMutationsContextValue {
  const context = useContext(SeriesMutationsContext);
  if (!context) {
    throw new Error(
      "useSeriesMutations must be used within a SeriesMutationsProvider"
    );
  }
  return context;
}

export function useSeriesMutations(): SeriesMutations {
  return useSeriesMutationsContext();
}

/**
 * Fusionne la liste serveur des favoris avec les ajouts/retraits optimistes.
 * Un override n'est appliqué que tant que la présence serveur est celle qu'il
 * a observée : dès que le refresh confirme la nouvelle valeur, le serveur
 * reprend la main sans intervention de la surface.
 */
export function useFavoriteSet(favoriteIds: string[]): Set<string> {
  const { favoriteOverrides } = useSeriesMutationsContext();
  return useMemo(() => {
    const set = new Set(favoriteIds);
    for (const [seriesId, override] of favoriteOverrides) {
      if (set.has(seriesId) !== override.serverValue) continue;
      if (override.value) set.add(seriesId);
      else set.delete(seriesId);
    }
    return set;
  }, [favoriteIds, favoriteOverrides]);
}
