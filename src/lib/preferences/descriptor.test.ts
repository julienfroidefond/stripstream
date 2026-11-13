import { describe, expect, it } from "vitest";

import {
  preferenceCreateColumns,
  preferenceFields,
  preferencePatchToColumns,
  readPreferences,
  type PreferencesRow,
} from "./descriptor";
import { defaultPreferences, type UserPreferences } from "@/types/preferences";

function row(overrides: Partial<PreferencesRow> = {}): PreferencesRow {
  return {
    id: 1,
    userId: 7,
    showThumbnails: true,
    showOnlyUnread: false,
    anonymousMode: false,
    displayMode: { ...defaultPreferences.displayMode },
    background: { ...defaultPreferences.background },
    readerPrefetchCount: 5,
    readingDirection: "ltr",
    readerBackground: "default",
    readerDoublePageMode: false,
    readerPageTurn: true,
    defaultSortOrder: "title",
    showMissingBooks: true,
    hideMissingBooks: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

describe("preferenceFields", () => {
  it("covers every UserPreferences key", () => {
    // Erreur de compilation si `UserPreferences` gagne une clé sans descripteur.
    const covered: Record<keyof UserPreferences, unknown> = preferenceFields;

    expect(Object.keys(covered).sort()).toEqual(Object.keys(defaultPreferences).sort());
  });

  it("declares the default value of every preference", () => {
    for (const key of Object.keys(defaultPreferences) as Array<keyof UserPreferences>) {
      expect(preferenceFields[key].defaultValue).toEqual(defaultPreferences[key]);
    }
  });
});

describe("readPreferences", () => {
  it("returns the defaults when the user has no row yet", () => {
    expect(readPreferences(null)).toEqual(defaultPreferences);
  });

  it("reads a complete row as-is", () => {
    expect(
      readPreferences(
        row({
          showOnlyUnread: true,
          readerPrefetchCount: 8,
          readingDirection: "rtl",
          defaultSortOrder: "latest",
        })
      )
    ).toEqual({
      ...defaultPreferences,
      showOnlyUnread: true,
      readerPrefetchCount: 8,
      readingDirection: "rtl",
      defaultSortOrder: "latest",
    });
  });

  it("completes an incomplete displayMode JSON with the defaults", () => {
    const preferences = readPreferences(
      row({ displayMode: { compact: true } as PreferencesRow["displayMode"] })
    );

    expect(preferences.displayMode).toEqual({
      compact: true,
      itemsPerPage: 24,
      viewMode: "grid",
      booksViewMode: "grid",
    });
  });

  it("falls back to a default enum when a legacy row stores null", () => {
    const preferences = readPreferences(
      row({
        readingDirection: null as unknown as string,
        readerBackground: null as unknown as string,
        defaultSortOrder: null as unknown as string,
      })
    );

    expect(preferences.readingDirection).toBe(defaultPreferences.readingDirection);
    expect(preferences.readerBackground).toBe(defaultPreferences.readerBackground);
    expect(preferences.defaultSortOrder).toBe(defaultPreferences.defaultSortOrder);
  });

  it("merges a partial background JSON with the defaults", () => {
    const preferences = readPreferences(
      row({ background: { type: "gradient" } as PreferencesRow["background"] })
    );

    expect(preferences.background).toEqual({
      type: "gradient",
      opacity: 10,
      blur: 0,
    });
  });
});

describe("preferencePatchToColumns", () => {
  it("only writes the keys present in the patch", () => {
    expect(preferencePatchToColumns({ showOnlyUnread: true })).toEqual({
      showOnlyUnread: true,
    });
  });

  it("writes nothing for an empty patch", () => {
    expect(preferencePatchToColumns({})).toEqual({});
  });

  it("normalizes a partial displayMode before writing it", () => {
    expect(
      preferencePatchToColumns({
        displayMode: { ...defaultPreferences.displayMode, compact: true, itemsPerPage: 30 },
      })
    ).toEqual({
        displayMode: {
          compact: true,
          itemsPerPage: 24,
          viewMode: "grid",
          booksViewMode: "grid",
        },
      });
  });

  it("merges a partial background with the defaults before writing it", () => {
    expect(preferencePatchToColumns({ background: { type: "image" } })).toEqual({
      background: { type: "image", opacity: 10, blur: 0 },
    });
  });
});

describe("preferenceCreateColumns", () => {
  it("writes every column from the defaults", () => {
    const columns = preferenceCreateColumns();

    expect(Object.keys(columns).sort()).toEqual(
      [...Object.values(preferenceFields).map((field) => field.column)].sort()
    );
    expect(columns).toMatchObject(defaultPreferences);
  });

  it("lets overrides win over the defaults", () => {
    const columns = preferenceCreateColumns({
      showOnlyUnread: true,
      readingDirection: "rtl",
    });

    expect(columns.showOnlyUnread).toBe(true);
    expect(columns.readingDirection).toBe("rtl");
    expect(columns.showThumbnails).toBe(defaultPreferences.showThumbnails);
  });
});
