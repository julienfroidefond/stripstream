import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Frontière du préchargement (ADR 0031).
 *
 * Ces composants rendent des collections : grilles de séries et de tomes,
 * rangées de l'accueil, mur, résultats de recherche. Un `<Link>` Next par
 * carte précharge chaque lien visible ; sur le mur (420 tuiles) cela a produit
 * des milliers de requêtes RSC et une mise en liste noire par le proxy. Ils
 * passent par `IntentLink`, ou désactivent explicitement le préchargement.
 */
const DENSE_SURFACES = [
  "../ui/cover-card.tsx",
  "../ui/book-cover-scene.tsx",
  "../home/RecommendationsRow.tsx",
  "../in-progress/InProgressCard.tsx",
  "../series/BookCard.tsx",
  "../reading-lists/ReadingListCard.tsx",
  "../layout/GlobalSearch.tsx",
];

describe("dense collections never auto-prefetch", () => {
  for (const path of DENSE_SURFACES) {
    it(`${path} links through IntentLink`, () => {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source).not.toContain('from "next/link"');
      expect(source).toContain("IntentLink");
    });
  }

  it("the wall tile disables prefetching outright", () => {
    const source = readFileSync(new URL("../wall/WallTile.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/<Link[\s\S]*?prefetch=\{false\}/);
  });

  it("the ratings grid links each series through IntentLink", () => {
    const source = readFileSync(
      new URL("../../app/ratings/RatingsContent.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toMatch(/<IntentLink\s+href=\{`\/series\/\$\{item\.id\}`\}/);
  });
});
