import { describe, expect, it } from "vitest";

import type { NormalizedSeries } from "@/lib/providers/types";
import { cleanWallSummary, toWallItem } from "./wall.service";

describe("cleanWallSummary", () => {
  it("returns null when there is nothing to read", () => {
    expect(cleanWallSummary(null)).toBeNull();
    expect(cleanWallSummary(undefined)).toBeNull();
    expect(cleanWallSummary("   <p> </p> ")).toBeNull();
  });

  it("strips markup but keeps paragraph boundaries readable", () => {
    expect(
      cleanWallSummary("<p>Premier paragraphe.</p><p>Deuxième<br/>ligne.</p>")
    ).toBe("Premier paragraphe. Deuxième ligne.");
  });

  it("decodes the entities providers actually emit", () => {
    expect(
      cleanWallSummary("Tom &amp; Jerry&nbsp;: &quot;fin&quot; &#39;provisoire&#39;")
    ).toBe('Tom & Jerry : "fin" \'provisoire\'');
  });

  it("never leaves a tag-like sequence in the plain-text summary", () => {
    expect(cleanWallSummary("<<script>alert('x')</script>")).toBe("alert('x')");
    expect(cleanWallSummary("&lt;script&gt;alert('x')&lt;/script&gt;")).toBe("alert('x')");
  });

  it("caps very long summaries without cutting mid-word upstream", () => {
    const summary = cleanWallSummary("mot ".repeat(900));
    expect(summary).not.toBeNull();
    expect(summary?.endsWith("…")).toBe(true);
    expect(summary?.length).toBeLessThanOrEqual(1401);
  });
});

function series(overrides: Partial<NormalizedSeries> = {}): NormalizedSeries {
  return {
    id: "series-1",
    name: "Les Naufragés",
    bookCount: 8,
    booksReadCount: 3,
    thumbnailUrl: "/api/komga/thumbnail/series-1",
    summary: "<p>Une <strong>île</strong>.</p>",
    authors: [{ name: " Ada ", role: "writer" }, { name: "", role: "" }, { name: "Bo", role: "artist" }],
    genres: ["Aventure", "  ", "Drame"],
    startYear: 1987,
    ...overrides,
  };
}

describe("toWallItem", () => {
  it("keeps only what the plaque needs and normalizes metadata", () => {
    const item = toWallItem(series(), "Bacs à sable");

    expect(item).toMatchObject({
      id: "series-1",
      name: "Les Naufragés",
      summary: "Une île.",
      authors: ["Ada", "Bo"],
      genres: ["Aventure", "Drame"],
      libraryName: "Bacs à sable",
      bookCount: 8,
      booksReadCount: 3,
      startYear: 1987,
    });
  });

  it("tolerates sparse series and caps authors and genres", () => {
    const item = toWallItem(
      series({
        summary: null,
        authors: Array.from({ length: 6 }, (_, index) => ({
          name: `Auteur ${index}`,
          role: "",
        })),
        genres: ["a", "b", "c", "d", "e", "f"],
        startYear: null,
        seriesStatus: "ongoing",
        missingCount: 2,
        communityScore: 4.5,
      }),
      "Bacs à sable"
    );

    expect(item.summary).toBeNull();
    expect(item.authors).toHaveLength(3);
    expect(item.genres).toEqual(["a", "b", "c", "d"]);
    expect(item.startYear).toBeNull();
    expect(item.seriesStatus).toBe("ongoing");
    expect(item.missingCount).toBe(2);
    expect(item.communityScore).toBe(4.5);
  });

  it("falls back to null when the provider omits optional fields", () => {
    const item = toWallItem(
      {
        id: "s",
        name: "S",
        bookCount: 0,
        booksReadCount: 0,
        thumbnailUrl: "/cover",
      },
      "L"
    );

    expect(item.authors).toEqual([]);
    expect(item.genres).toEqual([]);
    expect(item.startYear).toBeNull();
    expect(item.seriesStatus).toBeNull();
    expect(item.missingCount).toBeNull();
    expect(item.communityScore).toBeNull();
  });
});
