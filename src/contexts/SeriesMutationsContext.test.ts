// @vitest-environment jsdom
import { createElement, type ReactElement, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedSeries } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({
  addToFavorites: vi.fn(),
  removeFromFavorites: vi.fn(),
  shelveSeries: vi.fn(),
  unshelveSeries: vi.fn(),
  refresh: vi.fn(),
  toast: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/app/actions/favorites", () => ({
  addToFavorites: mocks.addToFavorites,
  removeFromFavorites: mocks.removeFromFavorites,
}));

vi.mock("@/app/actions/series-shelf", () => ({
  shelveSeries: mocks.shelveSeries,
  unshelveSeries: mocks.unshelveSeries,
}));

// Le provider monte le seam de progression de lecture : ses actions serveur
// ne doivent pas être chargées par ce test.
vi.mock("@/app/actions/read-progress", () => ({
  updateReadProgress: vi.fn(),
  deleteReadProgress: vi.fn(),
  updateSeriesReadStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/components/ui/toast", async () => {
  const React = await import("react");
  return {
    ToastAction: ({
      children,
      onClick,
    }: {
      children: ReactNode;
      onClick?: () => void;
    }) => React.createElement("button", { type: "button", onClick }, children),
  };
});

vi.mock("@/hooks/useTranslate", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/logger", () => ({
  default: { error: mocks.loggerError },
}));

import {
  SeriesMutationsProvider,
  useFavoriteSet,
  useSeriesMutations,
} from "./SeriesMutationsContext";
import { subscribeToFavoriteChanges } from "@/lib/series/favorite-events";

interface ActionResult {
  success: boolean;
  message?: string;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const seriesA: NormalizedSeries = {
  id: "series-a",
  name: "Série A",
  bookCount: 10,
  booksReadCount: 0,
  thumbnailUrl: "",
  libraryId: "library-1",
};

const seriesB: NormalizedSeries = {
  id: "series-b",
  name: "Série B",
  bookCount: 5,
  booksReadCount: 0,
  thumbnailUrl: "",
  libraryId: "library-1",
};

function Wrapper({ children }: { children: ReactNode }) {
  return createElement(SeriesMutationsProvider, null, children);
}

function renderMutations() {
  return renderHook(() => useSeriesMutations(), { wrapper: Wrapper });
}

function renderFavoriteState(initialIds: string[]) {
  return renderHook(
    ({ ids }: { ids: string[] }) => ({
      mutations: useSeriesMutations(),
      favorites: useFavoriteSet(ids),
    }),
    { wrapper: Wrapper, initialProps: { ids: initialIds } }
  );
}

describe("SeriesMutationsContext", () => {
  beforeEach(() => {
    mocks.addToFavorites.mockReset();
    mocks.removeFromFavorites.mockReset();
    mocks.shelveSeries.mockReset();
    mocks.unshelveSeries.mockReset();
    mocks.refresh.mockReset();
    mocks.toast.mockReset();
    mocks.loggerError.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("applique un favori de façon optimiste, notifie la sidebar et ne rafraîchit qu'une fois", async () => {
    const pending = deferred<ActionResult>();
    mocks.addToFavorites.mockReturnValueOnce(pending.promise);
    const listener = vi.fn();
    const unsubscribe = subscribeToFavoriteChanges(listener);
    const { result } = renderMutations();

    let mutation: Promise<boolean | null> | undefined;
    act(() => {
      mutation = result.current.toggleFavorite(seriesA, false);
    });

    expect(result.current.isFavorite(seriesA.id, false)).toBe(true);
    expect(result.current.isFavoritePending(seriesA.id)).toBe(true);
    expect(mocks.addToFavorites).toHaveBeenCalledWith(seriesA.id);
    expect(mocks.refresh).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ success: true });
      await mutation;
    });

    expect(result.current.isFavorite(seriesA.id, false)).toBe(true);
    expect(result.current.isFavoritePending(seriesA.id)).toBe(false);
    expect(listener).toHaveBeenCalledWith({
      seriesId: seriesA.id,
      action: "add",
      series: seriesA,
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "seriesMutations.favorite.added",
        description: seriesA.name,
      })
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("annule l'état optimiste et n'ouvre pas de refresh quand l'action échoue", async () => {
    mocks.addToFavorites.mockResolvedValueOnce({
      success: false,
      message: "Refusé",
    });
    const { result } = renderMutations();

    await act(async () => {
      await result.current.toggleFavorite(seriesA, false);
    });

    expect(result.current.isFavorite(seriesA.id, false)).toBe(false);
    expect(result.current.isFavoritePending(seriesA.id)).toBe(false);
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "seriesMutations.favorite.error",
        description: "Refusé",
      })
    );
  });

  it("verrouille une série tant qu'une mutation est en cours", async () => {
    const pending = deferred<ActionResult>();
    mocks.addToFavorites.mockReturnValueOnce(pending.promise);
    const { result } = renderMutations();

    let first: Promise<boolean | null> | undefined;
    let second: Promise<boolean | null> | undefined;
    act(() => {
      first = result.current.toggleFavorite(seriesA, false);
      second = result.current.toggleFavorite(seriesA, false);
    });

    expect(mocks.addToFavorites).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeNull();

    await act(async () => {
      pending.resolve({ success: true });
      await first;
    });
    expect(result.current.isFavoritePending(seriesA.id)).toBe(false);
  });

  it("met de côté de façon optimiste et l'annulation du toast reprend la série", async () => {
    const pending = deferred<ActionResult>();
    mocks.shelveSeries.mockReturnValueOnce(pending.promise);
    mocks.unshelveSeries.mockResolvedValueOnce({ success: true });
    const { result } = renderMutations();

    let mutation: Promise<boolean | null> | undefined;
    act(() => {
      mutation = result.current.setShelf(seriesA, true, { undo: true });
    });

    expect(result.current.isShelved(seriesA.id, false)).toBe(true);
    expect(result.current.isShelfPending(seriesA.id)).toBe(true);

    await act(async () => {
      pending.resolve({ success: true });
      await mutation;
    });

    expect(mocks.shelveSeries).toHaveBeenCalledWith(seriesA.id, seriesA.libraryId);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    const shelfToast = mocks.toast.mock.calls.find(
      ([value]) => value?.title === "seriesMutations.shelf.shelved"
    )?.[0];
    expect(shelfToast?.action).toBeTruthy();

    const undo = shelfToast.action as ReactElement<{ onClick: () => void }>;
    await act(async () => {
      undo.props.onClick();
    });
    await vi.waitFor(() =>
      expect(mocks.unshelveSeries).toHaveBeenCalledWith(
        seriesA.id,
        seriesA.libraryId
      )
    );
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(2));
    expect(result.current.isShelved(seriesA.id, false)).toBe(false);
  });

  it("fusionne les favoris optimistes avec la liste serveur puis laisse le serveur reprendre la main", async () => {
    mocks.addToFavorites.mockResolvedValueOnce({ success: true });
    mocks.removeFromFavorites.mockResolvedValueOnce({ success: true });
    const { result, rerender } = renderFavoriteState([seriesA.id]);

    expect(result.current.favorites.has(seriesA.id)).toBe(true);
    expect(result.current.favorites.has(seriesB.id)).toBe(false);

    await act(async () => {
      await result.current.mutations.toggleFavorite(seriesB, false);
    });
    expect(result.current.favorites.has(seriesB.id)).toBe(true);

    rerender({ ids: [seriesA.id, seriesB.id] });
    expect(result.current.favorites).toEqual(new Set([seriesA.id, seriesB.id]));

    await act(async () => {
      await result.current.mutations.toggleFavorite(seriesA, true);
    });
    expect(result.current.favorites.has(seriesA.id)).toBe(false);

    rerender({ ids: [seriesB.id] });
    expect(result.current.favorites).toEqual(new Set([seriesB.id]));
  });
});
