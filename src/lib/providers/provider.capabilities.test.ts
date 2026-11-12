import { describe, expect, it } from "vitest";

import { KomgaProvider } from "./komga/komga.provider";
import {
  createProviderCapabilities,
  type ProviderCapabilities,
  type ProviderCapabilityKey,
} from "./provider.interface";
import { StripstreamProvider } from "./stripstream/stripstream.provider";

const ALL_CAPABILITIES: ProviderCapabilityKey[] = [
  "readingLists",
  "search",
  "ratings",
  "shelf",
  "missingBooks",
  "discovery",
  "favorites",
];

function present(capabilities: ProviderCapabilities): ProviderCapabilityKey[] {
  return ALL_CAPABILITIES.filter((key) => capabilities[key] !== null);
}

describe("provider capabilities", () => {
  it("treats every optional feature as absent by default", () => {
    expect(present(createProviderCapabilities())).toEqual([]);
  });

  it("declares only search for Komga", () => {
    const provider = new KomgaProvider("http://komga.test", "secret");

    expect(present(provider.capabilities)).toEqual(["search"]);
  });

  it("does not expose unimplemented Komga methods", () => {
    const provider = new KomgaProvider("http://komga.test", "secret");

    expect(provider).not.toHaveProperty("getReadingLists");
    expect(provider).not.toHaveProperty("getSeriesRating");
    expect(provider).not.toHaveProperty("getShelvedSeries");
    expect(provider).not.toHaveProperty("getMissingBooks");
    expect(provider).not.toHaveProperty("getRelatedSeries");
    expect(provider).not.toHaveProperty("getFavorites");
  });

  it("declares every optional feature for Stripstream", () => {
    const provider = new StripstreamProvider("http://stripstream.test", "token");

    expect(present(provider.capabilities)).toEqual(ALL_CAPABILITIES);
  });
});
