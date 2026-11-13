import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert, getCurrentUser } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    preferences: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      upsert: (...args: unknown[]) => upsert(...args),
    },
  },
}));

vi.mock("@/lib/auth-utils", () => ({ getCurrentUser }));

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
    readerFitMode: "fit",
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
  getCurrentUser.mockReset();
  getCurrentUser.mockResolvedValue({ id: "42" });
});

describe("PreferencesService.getPreferences", () => {
  it("returns the defaults when the user has no row", async () => {
    findUnique.mockResolvedValue(null);

    await expect(PreferencesService.getPreferences()).resolves.toEqual(defaultPreferences);
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: 42 } });
  });

  it("normalizes the stored JSON before returning it", async () => {
    findUnique.mockResolvedValue(
      row({
        background: { type: "gradient" } as PreferencesRow["background"],
        displayMode: { compact: true } as PreferencesRow["displayMode"],
      })
    );

    const preferences = await PreferencesService.getPreferences();

    expect(preferences.background).toEqual({ type: "gradient", opacity: 10, blur: 0 });
    expect(preferences.displayMode.itemsPerPage).toBe(24);
  });
});

describe("PreferencesService.updatePreferences", () => {
  it("only sends the patched columns to the update", async () => {
    upsert.mockResolvedValue(row({ showOnlyUnread: true }));

    await PreferencesService.updatePreferences({ showOnlyUnread: true });

    expect(upsert).toHaveBeenCalledWith({
      where: { userId: 42 },
      update: { showOnlyUnread: true },
      create: expect.objectContaining({ userId: 42, showOnlyUnread: true }),
    });
  });

  it("creates a complete row from the descriptor when none exists", async () => {
    upsert.mockResolvedValue(row());

    await PreferencesService.updatePreferences({});

    const { create } = upsert.mock.calls[0][0];

    expect(create.userId).toBe(42);
    expect(create).toMatchObject(defaultPreferences);
  });

  it("returns the row as read back from the database", async () => {
    upsert.mockResolvedValue(
      row({ readingDirection: "rtl", background: { type: "image" } as PreferencesRow["background"] })
    );

    const preferences = await PreferencesService.updatePreferences({ readingDirection: "rtl" });

    expect(preferences.readingDirection).toBe("rtl");
    expect(preferences.background).toEqual({ type: "image", opacity: 10, blur: 0 });
  });
});
