"use client";

import { useCallback, useState, useTransition } from "react";
import type { FeedPage } from "@/lib/home/feed-page";

interface UseFeedPaginationOptions<T> {
  /** Éléments rendus par le serveur ; la première page est tronquée à `pageSize`. */
  initialItems: readonly T[];
  /** Force `hasMore` quand le serveur le sait déjà (recommandations différées). */
  initialHasMore?: boolean;
  pageSize: number;
  /** Charge une page à partir de l'offset courant. */
  loadPage: (offset: number) => Promise<FeedPage<T>>;
  /** Appelé après l'ajout d'une page non vide, avant le rendu suivant. */
  onPageAppended?: (page: FeedPage<T>, previousItems: T[]) => void;
}

export interface FeedPagination<T> {
  items: T[];
  hasMore: boolean;
  isPending: boolean;
  loadMore: () => void;
}

/**
 * État de pagination unique des rangées de l'accueil.
 *
 * La première page est tronquée ici, chaque appel d'action ne renvoie que la
 * page suivante, et les pages sont ajoutées à la suite au lieu de remplacer la
 * liste. Les rangées ne gèrent donc ni compteur cumulé ni état de chargement.
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

  const loadMore = useCallback(() => {
    if (isPending || !hasMore) return;
    const previousItems = items;

    startTransition(async () => {
      let page: FeedPage<T>;
      try {
        page = await loadPage(previousItems.length);
      } catch {
        // Le bouton reste disponible : un échec réseau ne doit pas vider la rangée.
        return;
      }

      if (page.items.length === 0) {
        setHasMore(page.hasMore);
        return;
      }

      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      onPageAppended?.(page, previousItems);
    });
  }, [hasMore, isPending, items, loadPage, onPageAppended]);

  return { items, hasMore, isPending, loadMore };
}
