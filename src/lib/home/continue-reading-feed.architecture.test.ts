import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Frontière du hero « Reprendre la lecture ».
 *
 * `loadContinueReadingPage` possède la limite de sonde, la fusion, la découpe
 * et la résolution des séries. Le rendu initial et l'action ne peuvent donc
 * plus reconstruire cette orchestration : le test échoue si l'un des deux
 * appelle directement le provider ou une des briques internes.
 */
const CALLERS = {
  "rendu initial": new URL("../../app/page.tsx", import.meta.url),
  "action « Voir plus »": new URL("../../app/actions/home.ts", import.meta.url),
};

const FORBIDDEN = [
  "mergeResumeBooks",
  "resolveSeriesPool",
  "buildResumeEntries",
  "getHomeContinueReadingData",
];

describe("continue-reading orchestration", () => {
  for (const [surface, url] of Object.entries(CALLERS)) {
    it(`keeps the ${surface} free of feed orchestration`, () => {
      const source = readFileSync(url, "utf8");

      for (const token of FORBIDDEN) {
        expect(source).not.toContain(token);
      }
    });
  }
});

/**
 * Frontière de la politique de l'accueil (ADR 0026).
 *
 * Masquage anonyme, repli vide et règle « tout a échoué » vivent dans
 * `loadHomeFeeds` / `loadNextHomeFeedPage`. Les appelants ne chargent plus un
 * flux eux-mêmes et ne choisissent plus de repli.
 */
const POLICY_FORBIDDEN = [
  "loadHomeFeedPage",
  "loadContinueReadingPage",
  "emptyFeedPage",
  "settleHomeFeed",
  ".catch(",
  "allSettled",
  "getProvider",
];

describe("home feed policy", () => {
  for (const [surface, url] of Object.entries(CALLERS)) {
    it(`keeps the ${surface} free of feed policy`, () => {
      const source = readFileSync(url, "utf8");

      for (const token of POLICY_FORBIDDEN) {
        expect(source).not.toContain(token);
      }
    });
  }
});
