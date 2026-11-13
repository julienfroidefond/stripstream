"use server";

import { ERROR_CODES } from "@/constants/errorCodes";
import { runProviderAction, type ActionResult } from "@/lib/actions/action-runner";
import { PreferencesService } from "@/lib/services/preferences.service";
import type { HomeFeed, HomeFeedPage } from "@/lib/home/feed-page";
import {
  loadNextHomeFeedPage,
  type HomeSection,
  type HomeSectionPage,
} from "@/lib/home/home-feeds";
import type { ContinueReadingPage } from "@/lib/home/continue-reading-feed";

export type { ContinueReadingPage } from "@/lib/home/continue-reading-feed";

/**
 * Délègue « Voir plus » à la politique de l'accueil.
 *
 * Le runner résout la session et le provider et traduit les erreurs en
 * `ActionResult` (les services ne lisent pas la session, ADR 0029) ;
 * `loadNextHomeFeedPage` applique le masquage anonyme et la règle de page.
 */
function loadSectionPage<S extends HomeSection>(
  name: string,
  section: S,
  offset: number
): Promise<ActionResult<HomeSectionPage<S>>> {
  return runProviderAction<HomeSectionPage<S>>({
    name,
    fallbackCode: ERROR_CODES.HOME.FETCH_ERROR,
    logContext: { feed: section, offset },
    requireUser: true,
    execute: async ({ provider, userId }) => {
      const preferences = await PreferencesService.getPreferences(userId);
      const page = await loadNextHomeFeedPage(provider, section, offset, {
        isAnonymous: preferences.anonymousMode,
        userId,
      });
      return { message: "OK", items: page.items, hasMore: page.hasMore };
    },
  });
}

/**
 * Charge la page suivante du hero « Reprendre la lecture ».
 *
 * `offset` est le nombre de tomes déjà affichés. La page, la série et la
 * progression sont résolues par `continue-reading-feed.ts`, le même module que
 * le rendu initial : le hero n'a plus à fusionner ni à matcher côté client.
 */
export async function loadContinueReading(
  offset: number
): Promise<ActionResult<ContinueReadingPage>> {
  return loadSectionPage("loadContinueReading", "continue-reading", offset);
}

/**
 * Charge une page d'un flux de l'accueil à partir de `offset`.
 *
 * Le registre des flux possède la politique, le loader et la règle de
 * pagination de chaque section ; l'action ne fait que déléguer.
 */
export async function loadHomeFeed<F extends HomeFeed>(
  feed: F,
  offset: number
): Promise<ActionResult<HomeFeedPage<F>>> {
  return loadSectionPage("loadHomeFeed", feed, offset);
}
