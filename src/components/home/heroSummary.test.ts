import { describe, expect, it } from "vitest";

import { resolveHeroSummary } from "./heroSummary";

describe("resolveHeroSummary", () => {
  it("prefers the book summary over the series summary", () => {
    expect(
      resolveHeroSummary(
        { summary: "Résumé du tome 3" },
        { summary: "Résumé de la série" }
      )
    ).toBe("Résumé du tome 3");
  });

  it("trims the book summary", () => {
    expect(resolveHeroSummary({ summary: "  Résumé du tome  " }, null)).toBe(
      "Résumé du tome"
    );
  });

  it("falls back to the series summary when the book has none", () => {
    expect(resolveHeroSummary({ summary: null }, { summary: "Résumé de la série" })).toBe(
      "Résumé de la série"
    );
  });

  it("treats a blank book summary as absent", () => {
    expect(
      resolveHeroSummary({ summary: "   " }, { summary: "Résumé de la série" })
    ).toBe("Résumé de la série");
  });

  it("falls back to at most three genres", () => {
    expect(
      resolveHeroSummary(
        {},
        {
          genres: ["Fantasy", "", "Aventure", "BD", "Jeunesse"],
          authors: [{ name: "Auteur", role: "writer" }],
        }
      )
    ).toBe("Fantasy • Aventure • BD");
  });

  it("falls back to the first author when genres are absent", () => {
    expect(
      resolveHeroSummary(
        {},
        {
          genres: [],
          authors: [
            { name: "Alan Moore", role: "writer" },
            { name: "David Lloyd", role: "artist" },
          ],
        }
      )
    ).toBe("Alan Moore");
  });

  it("returns null when neither the book nor the series has metadata", () => {
    expect(resolveHeroSummary({}, null)).toBeNull();
    expect(resolveHeroSummary({ summary: " " }, { genres: [], authors: [] })).toBeNull();
  });
});
