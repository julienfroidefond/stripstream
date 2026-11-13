import logger from "@/lib/logger";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedSeries } from "@/lib/providers/types";
import type { ResumeEntry } from "@/lib/resume/resume-state";
import { loadContinueReadingPage } from "./continue-reading-feed";
import {
  emptyFeedPage,
  isHomeFeedHidden,
  type FeedPage,
  type HomeFeed,
  type HomeFeedContext,
  type HomeFeedItems,
  type HomeFeedPolicy,
  type HomeFeedState,
} from "./feed-page";
import {
  HOME_FEEDS,
  PERSONAL_FEED_POLICY,
  homeFeedPolicy,
  loadHomeFeedPage,
} from "./feed-registry";

/**
 * Sections de l'accueil : les rangées du registre plus le hero
 * « Reprendre la lecture », qui a sa propre orchestration (ADR 0013) mais
 * obéit à la même politique.
 */
export type HomeSection = HomeFeed | "continue-reading";

export interface HomeSectionItems extends HomeFeedItems {
  "continue-reading": ResumeEntry;
}

export type HomeSectionPage<S extends HomeSection = HomeSection> = FeedPage<
  HomeSectionItems[S]
>;

/** Le hero est personnel : masqué en anonyme, compté dans la règle d'échec. */
export const CONTINUE_READING_POLICY: HomeFeedPolicy = PERSONAL_FEED_POLICY;

/** Ordre de rendu des sections chargées par le serveur. */
export const HOME_SECTIONS: readonly HomeSection[] = [
  "continue-reading",
  ...HOME_FEEDS,
];

/** Politique d'une section, lue dans le registre ou celle du hero. */
export function homeSectionPolicy(section: HomeSection): HomeFeedPolicy {
  return section === "continue-reading"
    ? CONTINUE_READING_POLICY
    : homeFeedPolicy(section);
}

/** États réglés de chaque section : aucune promesse ne rejette. */
export type HomeFeedStates = {
  [S in HomeSection]: Promise<HomeFeedState<HomeSectionItems[S]>>;
};

export interface HomeFeeds {
  feeds: HomeFeedStates;
  /**
   * Règle « tout a échoué » : vrai quand chaque section visible, chargée par
   * le serveur et comptée (`countsTowardOutage`) a échoué.
   */
  outage: Promise<boolean>;
}

function settledState<T>(status: "hidden" | "deferred"): Promise<HomeFeedState<T>> {
  return Promise.resolve({ status, page: emptyFeedPage<T>() });
}

/** Applique la politique d'une section à son chargement. */
function settleSection<T>(
  section: HomeSection,
  context: HomeFeedContext,
  load: () => Promise<FeedPage<T>>
): Promise<HomeFeedState<T>> {
  const policy = homeSectionPolicy(section);
  if (isHomeFeedHidden(policy, context)) return settledState("hidden");
  if (policy.initial === "deferred") return settledState("deferred");

  return load().then(
    (page): HomeFeedState<T> => ({ status: "loaded", page }),
    (error: unknown): HomeFeedState<T> => {
      // `onFailure: "empty"` : la rangée se rend vide, l'accueil reste debout.
      logger.warn({ err: error, feed: section }, "home feed failed");
      return { status: "failed", page: emptyFeedPage<T>() };
    }
  );
}

/**
 * Charge le premier rendu de l'accueil.
 *
 * Point unique de la politique : masquage anonyme (les sections masquées ne
 * sont pas requêtées), sections différées, repli vide en cas d'échec et règle
 * « tout a échoué ». La page ne fait que rendre les états renvoyés.
 */
export function loadHomeFeeds(
  provider: IMediaProvider,
  context: HomeFeedContext
): HomeFeeds {
  const rowState = <F extends HomeFeed>(feed: F) =>
    settleSection(feed, context, () => loadHomeFeedPage(provider, feed, 0));

  const rows = Object.fromEntries(
    HOME_FEEDS.map((feed) => [feed, rowState(feed)])
  ) as { [F in HomeFeed]: Promise<HomeFeedState<HomeFeedItems[F]>> };

  // Le pool « ongoing » est déjà en vol : le hero le reçoit sous forme de
  // promesse pour lancer sa propre requête en parallèle (ADR 0013). Si la
  // rangée est masquée, le hero amorce lui-même son pool.
  const knownSeries: Promise<readonly NormalizedSeries[]> | undefined =
    isHomeFeedHidden(homeFeedPolicy("ongoing"), context)
      ? undefined
      : rows.ongoing.then((state) => state.page.items);

  const feeds: HomeFeedStates = {
    ...rows,
    "continue-reading": settleSection("continue-reading", context, () =>
      loadContinueReadingPage(provider, 0, { knownSeries })
    ),
  };

  const counted = HOME_SECTIONS.filter((section) => {
    const policy = homeSectionPolicy(section);
    return (
      policy.countsTowardOutage &&
      policy.initial === "eager" &&
      !isHomeFeedHidden(policy, context)
    );
  });

  const outage =
    counted.length === 0
      ? Promise.resolve(false)
      : Promise.all(
          counted.map((section) => feeds[section] as Promise<HomeFeedState<unknown>>)
        ).then((states) => states.every((state) => state.status === "failed"));

  return { feeds, outage };
}

/**
 * Charge la page suivante d'une section (« Voir plus »).
 *
 * La politique anonyme s'applique aussi ici : une section masquée renvoie une
 * page vide sans requête. Les erreurs remontent : l'action les traduit en
 * `ActionResult` et le client garde le bouton disponible.
 */
export async function loadNextHomeFeedPage<S extends HomeSection>(
  provider: IMediaProvider,
  section: S,
  offset: number,
  context: HomeFeedContext
): Promise<HomeSectionPage<S>> {
  if (isHomeFeedHidden(homeSectionPolicy(section), context)) {
    return emptyFeedPage<HomeSectionItems[S]>();
  }

  const page =
    section === "continue-reading"
      ? await loadContinueReadingPage(provider, offset)
      : await loadHomeFeedPage(provider, section as HomeFeed, offset);

  return page as HomeSectionPage<S>;
}
