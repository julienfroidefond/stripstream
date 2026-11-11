// @vitest-environment jsdom
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updatePreferencesAction: vi.fn(),
  toast: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/app/actions/preferences", () => ({
  updatePreferences: mocks.updatePreferencesAction,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated" }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/hooks/useTranslate", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/logger", () => ({
  default: { error: mocks.loggerError },
}));

import { defaultPreferences, type UserPreferences } from "@/types/preferences";
import { PreferencesProvider, usePreferences } from "./PreferencesContext";

function wrapperFor(initial: UserPreferences) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const props = {
      initialPreferences: initial,
    } as React.ComponentProps<typeof PreferencesProvider>;
    return React.createElement(PreferencesProvider, props, children);
  };
}

function renderPreferences(initial: UserPreferences) {
  return renderHook(() => usePreferences(), { wrapper: wrapperFor(initial) });
}

describe("PreferencesContext", () => {
  beforeEach(() => {
    mocks.updatePreferencesAction.mockReset();
    mocks.toast.mockReset();
    mocks.loggerError.mockReset();
  });

  it("updates optimistically, confirms with the server data and toasts once", async () => {
    const initial = { ...defaultPreferences, showThumbnails: true };
    const confirmed = { ...initial, showThumbnails: false };
    mocks.updatePreferencesAction.mockResolvedValueOnce({
      success: true,
      code: "OK",
      message: "Préférences mises à jour",
      data: confirmed,
    });
    const { result } = renderPreferences(initial);

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.updatePreferences(
        { showThumbnails: false },
        { feedback: "all" }
      );
    });

    expect(saved).toBe(true);
    expect(mocks.updatePreferencesAction).toHaveBeenCalledWith({
      showThumbnails: false,
    });
    expect(result.current.preferences.showThumbnails).toBe(false);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "settings.title",
      description: "settings.komga.messages.configSaved",
    });
  });

  it("rolls back and shows the standard error toast when the action fails", async () => {
    const initial = { ...defaultPreferences, showThumbnails: true };
    mocks.updatePreferencesAction.mockResolvedValueOnce({
      success: false,
      code: "PREFERENCES_UPDATE_ERROR",
      message: "Erreur",
    });
    const { result } = renderPreferences(initial);

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.updatePreferences(
        { showThumbnails: false },
        { feedback: "all" }
      );
    });

    expect(saved).toBe(false);
    expect(result.current.preferences.showThumbnails).toBe(true);
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "settings.error.title",
        description: "settings.error.message",
      })
    );
  });

  it("logs without toasting when the write asked for silent feedback", async () => {
    const initial = { ...defaultPreferences, readerPageTurn: true };
    mocks.updatePreferencesAction.mockResolvedValueOnce({
      success: false,
      code: "PREFERENCES_UPDATE_ERROR",
      message: "Erreur",
    });
    const { result } = renderPreferences(initial);

    await act(async () => {
      await result.current.updatePreferences({ readerPageTurn: false });
    });

    expect(result.current.preferences.readerPageTurn).toBe(true);
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
