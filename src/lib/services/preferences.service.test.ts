import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    preferences: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      upsert: (...args: unknown[]) => upsert(...args),
    },
  },
}));

vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { PreferencesService } from "./preferences.service";
import { defaultPreferences } from "@/types/preferences";
import type { PreferencesRow } from "@/lib/preferences/descriptor";

function row(overrides: Partial<PreferencesRow> = {}): PreferencesRow {
  return {
    id: 1,
    userId: 42,
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

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
});

describe("PreferencesService.getPreferences", () => {
  it("returns the defaults when the user has no row", async () => {
    findUnique.mockResolvedValue(null);

    await expect(PreferencesService.getPreferences(42)).resolves.toEqual(defaultPreferences);
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: 42 } });
  });

  it("normalizes the stored JSON before returning it", async () => {
    findUnique.mockResolvedValue(
      row({
        background: { type: "gradient" } as PreferencesRow["background"],
        displayMode: { compact: true } as PreferencesRow["displayMode"],
      })
    );

    const preferences = await PreferencesService.getPreferences(42);

    expect(preferences.background).toEqual({ type: "gradient", opacity: 10, blur: 0 });
    expect(preferences.displayMode.itemsPerPage).toBe(24);
  });
});

describe("PreferencesService.updatePreferences", () => {
  it("only sends the patched columns to the update", async () => {
    upsert.mockResolvedValue(row({ showOnlyUnread: true }));

    await PreferencesService.updatePreferences(42, { showOnlyUnread: true });

    expect(upsert).toHaveBeenCalledWith({
      where: { userId: 42 },
      update: { showOnlyUnread: true },
      create: expect.objectContaining({ userId: 42, showOnlyUnread: true }),
    });
  });

  it("creates a complete row from the descriptor when none exists", async () => {
    upsert.mockResolvedValue(row());

    await PreferencesService.updatePreferences(42, {});

    const { create } = upsert.mock.calls[0][0];

    expect(create.userId).toBe(42);
    expect(create).toMatchObject(defaultPreferences);
  });

  it("returns the row as read back from the database", async () => {
    upsert.mockResolvedValue(
      row({ readingDirection: "rtl", background: { type: "image" } as PreferencesRow["background"] })
    );

    const preferences = await PreferencesService.updatePreferences(42, { readingDirection: "rtl" });

    expect(preferences.readingDirection).toBe("rtl");
    expect(preferences.background).toEqual({ type: "image", opacity: 10, blur: 0 });
  });
});

describe("PreferencesService — injected identity", () => {
  it("reads and writes the row of the userId it receives", async () => {
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue(row({ userId: 7 }));

    await PreferencesService.getPreferences(7);
    await PreferencesService.updatePreferences(7, { anonymousMode: true });

    expect(findUnique).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7 }, update: { anonymousMode: true } })
    );
  });
});
