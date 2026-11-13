import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BOOK_PAGE_TOKEN, resolveBookMediaUrl } from "@/lib/providers/book-media";
import type { ProviderType } from "@/lib/providers/types";

import { parseMediaRef } from "./media-route-core";
import {
  bookPageUrlTemplate,
  MEDIA_ROUTE_PATTERNS,
  mediaRoutePattern,
  mediaUrl,
  SERVED_MEDIA_KINDS,
  type ServedMediaRef,
} from "./media-url";
import type { MediaKind } from "./types";

const API_ROOT = path.resolve(__dirname, "../../app/api");
const PROVIDERS = Object.keys(SERVED_MEDIA_KINDS) as ProviderType[];

/** Lit les paramètres d'une URL comme le ferait le routeur fichier de Next. */
function matchRoute(
  pattern: string,
  url: string
): { params: Record<string, string>; url: URL } | null {
  const parsed = new URL(url, "http://localhost");
  const patternSegments = pattern.split("/");
  const urlSegments = parsed.pathname.split("/");
  if (patternSegments.length !== urlSegments.length) return null;

  const params: Record<string, string> = {};
  for (const [index, segment] of patternSegments.entries()) {
    const dynamic = /^\[(\w+)\]$/.exec(segment);
    if (dynamic) {
      params[dynamic[1]] = decodeURIComponent(urlSegments[index]);
    } else if (segment !== urlSegments[index]) {
      return null;
    }
  }
  return { params, url: parsed };
}

const SAMPLE_REFS: Record<MediaKind, ServedMediaRef<"komga">> = {
  "book-file": { kind: "book-file", bookId: "book 1/é" },
  "book-page": { kind: "book-page", bookId: "book-1", pageNumber: 4 },
  "book-page-thumbnail": { kind: "book-page-thumbnail", bookId: "book-1", pageNumber: 2 },
  "book-cover": { kind: "book-cover", bookId: "book-1" },
  "series-cover": { kind: "series-cover", seriesId: "series-1" },
};

function routeFile(provider: ProviderType, kind: MediaKind): string {
  return path.join(API_ROOT, provider, MEDIA_ROUTE_PATTERNS[kind], "route.ts");
}

function listRouteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return listRouteFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

describe("mediaUrl", () => {
  it("keeps the public URLs already emitted by the adapters", () => {
    expect(mediaUrl("komga", { kind: "book-cover", bookId: "b1" })).toBe(
      "/api/komga/images/books/b1/thumbnail"
    );
    expect(mediaUrl("komga", { kind: "series-cover", seriesId: "s1" })).toBe(
      "/api/komga/images/series/s1/thumbnail"
    );
    expect(mediaUrl("komga", { kind: "book-file", bookId: "b1" })).toBe(
      "/api/komga/books/b1/file"
    );
    expect(mediaUrl("stripstream", { kind: "book-cover", bookId: "b1" })).toBe(
      "/api/stripstream/images/books/b1/thumbnail"
    );
    expect(
      mediaUrl("stripstream", { kind: "book-page", bookId: "b1", pageNumber: 3, query: "w=1" })
    ).toBe("/api/stripstream/images/books/b1/pages/3?w=1");
  });

  it("encodes ids so a segment can never escape its route", () => {
    expect(mediaUrl("komga", { kind: "book-cover", bookId: "a/b" })).toBe(
      "/api/komga/images/books/a%2Fb/thumbnail"
    );
  });

  for (const provider of PROVIDERS) {
    for (const kind of SERVED_MEDIA_KINDS[provider]) {
      it(`round-trips ${provider} ${kind} through its route`, () => {
        const ref = SAMPLE_REFS[kind];
        const match = matchRoute(mediaRoutePattern(provider, kind), mediaUrl(provider, ref));
        expect(match).not.toBeNull();
        expect(parseMediaRef(kind, match!.params, match!.url)).toEqual(ref);
      });
    }
  }

  it("round-trips the raw page query", () => {
    const ref = {
      kind: "book-page" as const,
      bookId: "b1",
      pageNumber: 9,
      query: "format=webp&width=600",
    };
    const match = matchRoute(
      mediaRoutePattern("stripstream", "book-page"),
      mediaUrl("stripstream", ref)
    );
    expect(parseMediaRef("book-page", match!.params, match!.url)).toEqual(ref);
  });
});

describe("bookPageUrlTemplate", () => {
  it("keeps the {page} token for the reader", () => {
    const template = bookPageUrlTemplate("komga", "book-page-thumbnail", "b1");
    expect(template).toBe(`/api/komga/images/books/b1/pages/${BOOK_PAGE_TOKEN}/thumbnail`);
    expect(resolveBookMediaUrl(template, 5)).toBe(
      mediaUrl("komga", { kind: "book-page-thumbnail", bookId: "b1", pageNumber: 5 })
    );
  });

  it("resolves to the same URL as mediaUrl for a page", () => {
    const template = bookPageUrlTemplate("stripstream", "book-page", "b1");
    expect(resolveBookMediaUrl(template, 2)).toBe(
      mediaUrl("stripstream", { kind: "book-page", bookId: "b1", pageNumber: 2 })
    );
  });
});

describe("media route files", () => {
  for (const provider of PROVIDERS) {
    for (const kind of SERVED_MEDIA_KINDS[provider]) {
      it(`declares ${provider} ${kind} at its pattern`, () => {
        const file = routeFile(provider, kind);
        expect(existsSync(file)).toBe(true);
        expect(readFileSync(file, "utf8")).toContain(
          `createMediaRoute("${provider}", "${kind}")`
        );
      });
    }
  }

  it("has no media route outside the declared table", () => {
    const declared = new Set(
      PROVIDERS.flatMap((provider) =>
        SERVED_MEDIA_KINDS[provider].map((kind) => routeFile(provider, kind))
      )
    );
    const onDisk = PROVIDERS.flatMap((provider) =>
      listRouteFiles(path.join(API_ROOT, provider))
    );
    expect(onDisk.filter((file) => !declared.has(file))).toEqual([]);
  });
});
