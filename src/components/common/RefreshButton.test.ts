// @vitest-environment jsdom
import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  toast: vi.fn(),
  isRefreshing: false,
}));

vi.mock("@/contexts/RefreshContext", () => ({
  useRefreshSurface: () => ({
    scope: "library",
    id: "library-1",
    isRefreshing: mocks.isRefreshing,
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/hooks/useTranslate", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

import { RefreshButton } from "./RefreshButton";

describe("RefreshButton", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    mocks.toast.mockReset();
    mocks.isRefreshing = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("déclenche le refresh du contexte et affiche le toast de succès", async () => {
    mocks.refresh.mockResolvedValueOnce({ success: true });
    render(createElement(RefreshButton));

    const button = screen.getByRole("button", { name: "refresh.button" });
    expect(button.getAttribute("data-refresh-scope")).toBe("library");
    expect(button.getAttribute("data-refresh-id")).toBe("library-1");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "refresh.success.title",
      description: "refresh.success.description",
    });
  });

  it("affiche l'erreur fournie par la surface", async () => {
    mocks.refresh.mockResolvedValueOnce({ success: false, error: "boom" });
    render(createElement(RefreshButton));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "refresh.button" }));
    });

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "refresh.error.title",
        description: "boom",
      })
    );
  });

  it("utilise le message générique quand l'échec n'en fournit pas", async () => {
    mocks.refresh.mockResolvedValueOnce({ success: false });
    render(createElement(RefreshButton));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "refresh.button" }));
    });

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "refresh.error.title",
        description: "refresh.error.description",
      })
    );
  });

  it("reste désactivé quand la surface est déjà en cours de refresh", () => {
    mocks.isRefreshing = true;
    render(createElement(RefreshButton));

    const button = screen.getByRole("button", {
      name: "refresh.button",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.click(button);

    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
