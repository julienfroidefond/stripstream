import { describe, expect, it } from "vitest";

import { selectApprovedMetadataLink } from "./metadata-links";
import type { StripstreamMetadataLink } from "@/types/stripstream";

function makeLink(
  id: string,
  overrides: Partial<StripstreamMetadataLink> = {}
): StripstreamMetadataLink {
  return {
    id,
    series_name: "L'Incal",
    provider: "bdtheque",
    external_id: `ext-${id}`,
    status: "approved",
    metadata_json: {},
    ...overrides,
  };
}

describe("selectApprovedMetadataLink", () => {
  it("prefers the primary link even when it is not returned first", () => {
    const secondary = makeLink("secondary", { is_primary: false });
    const primary = makeLink("primary", { provider: "bdphile", is_primary: true });

    expect(selectApprovedMetadataLink([secondary, primary])).toBe(primary);
  });

  it("falls back to the first approved link when no primary is flagged", () => {
    const first = makeLink("first", { is_primary: false });
    const second = makeLink("second", { is_primary: false });

    expect(selectApprovedMetadataLink([first, second])).toBe(first);
  });

  it("ignores pending and rejected links, even when they are flagged primary", () => {
    const rejected = makeLink("rejected", { status: "rejected", is_primary: true });
    const pending = makeLink("pending", { status: "pending", is_primary: true });
    const approved = makeLink("approved", { is_primary: false });

    expect(selectApprovedMetadataLink([rejected, pending, approved])).toBe(approved);
  });

  it("returns undefined when no link is approved", () => {
    expect(
      selectApprovedMetadataLink([
        makeLink("pending", { status: "pending" }),
        makeLink("rejected", { status: "rejected" }),
      ])
    ).toBeUndefined();
  });
});
