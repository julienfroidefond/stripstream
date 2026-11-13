"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions/action-runner";
import type { FeedPage } from "@/lib/home/feed-page";

interface UseFeedPaginationOptions<T> {
  /** Éléments rendus par le serveur ; la première page est tronquée à `pageSize`. */
  initialItems: readonly T[];
  /** Force `hasMore` quand le serveur le sait déjà (recommandations différées). */
  initialHasMore?: boolean;
  pageSize: number;
  /**
   * Charge une page à partir de l'offset courant : une action serveur qui
   * renvoie un `ActionResult` portant la page en cas de succès.
   */
  loadPage: (offset: number) => Promise<ActionResult<FeedPage<T>>>;
  /** Appelé après l'ajout d'une page non vide, avant le rendu suivant. */
  onPageAppended?: (page: FeedPage<T>, previousItems: T[]) => void;
}

export interface FeedPagination<T> {
  items: T[];
  hasMore: boolean;
  isPending: boolean;
  loadMore: () => void;
}

interface FirstPage<T> {
  items: readonly T[];
  hasMore: boolean | undefined;
}

function sameFirstPage<T>(a: FirstPage<T>, b: FirstPage<T>): boolean {
  return (
    a.hasMore === b.hasMore &&
    a.items.length === b.items.length &&
    a.items.every((item, index) => item === b.items[index])
  );
}

/**
 * État de pagination unique des rangées de l'accueil.
 *
 * La première page est tronquée ici, chaque appel d'action ne renvoie que la
 * page suivante, et les pages sont ajoutées à la suite au lieu de remplacer la
 * liste. Les rangées ne gèrent donc ni compteur cumulé ni état de chargement.
 *
 * Quand le serveur livre une nouvelle première page (`router.refresh()`, bouton
 * « Rafraîchir », bascule du mode anonyme), elle remplace tout l'état : les
 * pages déjà ajoutées sont abandonnées et une page encore en vol, demandée à
 * partir de l'ancienne liste, est ignorée à son arrivée.
 */
export function useFeedPagination<T>({
  initialItems,
  initialHasMore,
  pageSize,
  loadPage,
  onPageAppended,
}: UseFeedPaginationOptions<T>): FeedPagination<T> {
  const [items, setItems] = useState<T[]>(() => initialItems.slice(0, pageSize));
  const [hasMore, setHasMore] = useState(
    initialHasMore ?? initialItems.length > pageSize
  );
  const [isPending, startTransition] = useTransition();

  // Ajustement pendant le rendu. La comparaison est superficielle : un tableau
  // recréé avec les mêmes éléments ne réinitialise pas la rangée.
  const firstPage: FirstPage<T> = { items: initialItems, hasMore: initialHasMore };
  const [syncedFirstPage, setSyncedFirstPage] = useState(firstPage);
  if (!sameFirstPage(syncedFirstPage, firstPage)) {
    setSyncedFirstPage(firstPage);
    setItems(initialItems.slice(0, pageSize));
    setHasMore(initialHasMore ?? initialItems.length > pageSize);
  }

  /** Première page courante, relue par un chargement en vol à son arrivée. */
  const generationRef = useRef(syncedFirstPage);
  useEffect(() => {
    generationRef.current = syncedFirstPage;
  }, [syncedFirstPage]);

  const loadMore = useCallback(() => {
    if (isPending || !hasMore) return;
    const previousItems = items;
    const generation = syncedFirstPage;

    startTransition(async () => {
      let result: ActionResult<FeedPage<T>>;
      try {
        result = await loadPage(previousItems.length);
      } catch {
        // Le bouton reste disponible : un échec réseau ne doit pas vider la rangée.
        return;
      }
      // La première page a été remplacée pendant le chargement : cette suite
      // prolongerait une liste qui n'existe plus.
      if (generationRef.current !== generation) return;
      // Un échec métier (provider en panne) garde aussi la rangée et le bouton.
      if (!result.success) return;

      const page: FeedPage<T> = { items: result.items, hasMore: result.hasMore };

      if (page.items.length === 0) {
        setHasMore(page.hasMore);
        return;
      }

      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      onPageAppended?.(page, previousItems);
    });
  }, [hasMore, isPending, items, loadPage, onPageAppended, syncedFirstPage]);

  return { items, hasMore, isPending, loadMore };
}
