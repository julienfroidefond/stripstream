// @vitest-environment jsdom
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updatePreferences: vi.fn(),
  anonymousMode: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/contexts/PreferencesContext", () => ({
  usePreferences: () => ({
    preferences: { anonymousMode: mocks.anonymousMode },
    updatePreferences: mocks.updatePreferences,
  }),
}));

import { AnonymousProvider, useAnonymous } from "./AnonymousContext";

function renderAnonymous() {
  return renderHook(() => useAnonymous(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(AnonymousProvider, null, children),
  });
}

describe("AnonymousContext", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    mocks.updatePreferences.mockReset();
    mocks.anonymousMode = false;
  });

  it("refreshes the route once the anonymous switch is saved", async () => {
    mocks.updatePreferences.mockResolvedValue(true);
    const { result } = renderAnonymous();

    await act(async () => {
      await result.current.toggleAnonymous();
    });

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ anonymousMode: true });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.updatePreferences.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.refresh.mock.invocationCallOrder[0]
    );
  });

  it("does not refresh when the write fails", async () => {
    mocks.anonymousMode = true;
    mocks.updatePreferences.mockResolvedValue(false);
    const { result } = renderAnonymous();

    await expect(result.current.toggleAnonymous()).rejects.toBeDefined();

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ anonymousMode: false });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
