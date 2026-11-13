"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import {
  emptyFeedPage,
  type HomeFeed,
  type HomeFeedItem,
  type HomeFeedPage,
} from "@/lib/home/feed-page";
import { loadHomeFeedPage } from "@/lib/home/feed-registry";
import {
  loadContinueReadingPage,
  type ContinueReadingPage,
} from "@/lib/home/continue-reading-feed";

export type { ContinueReadingPage } from "@/lib/home/continue-reading-feed";

/**
 * Charge la page suivante du hero « Reprendre la lecture ».
 *
 * `offset` est le nombre de tomes déjà affichés. La page, la série et la
 * progression sont résolues par `loadContinueReadingPage`, le même module que
 * le rendu initial : le hero n'a plus à fusionner ni à matcher côté client.
 */
export async function loadContinueReading(
  offset: number
): Promise<ContinueReadingPage> {
  const provider = await getProvider();
  if (!provider) return emptyFeedPage();

  return loadContinueReadingPage(provider, offset);
}

/**
 * Charge une page d'un flux de l'accueil à partir de `offset`.
 *
 * Le registre des flux possède le loader et la règle de pagination de chaque
 * section ; l'action ne fait que résoudre le provider actif.
 */
export async function loadHomeFeed<F extends HomeFeed>(
  feed: F,
  offset: number
): Promise<HomeFeedPage<F>> {
  const provider = await getProvider();
  if (!provider) return emptyFeedPage<HomeFeedItem<F>>();

  return loadHomeFeedPage(provider, feed, offset);
}
