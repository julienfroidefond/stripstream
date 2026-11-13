// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";
import type { UnifiedConnection } from "@/lib/connections/client";

vi.mock("@/app/actions/connections", () => ({ activateConnection: vi.fn() }));

const { activateConnection } = await import("@/app/actions/connections");
const { useActivateConnection } = await import("./useActivateConnection");

const CONNECTION: UnifiedConnection = {
  key: "komga-3",
  provider: "komga",
  id: 3,
  name: "Stub B",
  url: "http://b",
  isActive: false,
  fields: {},
};

beforeEach(() => {
  vi.mocked(activateConnection).mockReset();
});

describe("useActivateConnection", () => {
  it("reloads the whole page after a successful activation and stays pending", async () => {
    vi.mocked(activateConnection).mockResolvedValue({
      success: true,
      code: "OK",
      message: "ok",
      name: "Stub B",
    });
    const reload = vi.fn();
    const { result } = renderHook(() => useActivateConnection(reload));

    await act(async () => {
      await result.current.activate(CONNECTION);
    });

    expect(activateConnection).toHaveBeenCalledWith({ provider: "komga", id: 3 });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.pendingKey).toBe("komga-3");
  });

  it("does not reload on failure and clears the pending key", async () => {
    vi.mocked(activateConnection).mockResolvedValue({
      success: false,
      code: ERROR_CODES.CONFIG.NOT_FOUND,
      message: "missing",
    });
    const reload = vi.fn();
    const { result } = renderHook(() => useActivateConnection(reload));

    let outcome: Awaited<ReturnType<typeof result.current.activate>> | undefined;
    await act(async () => {
      outcome = await result.current.activate(CONNECTION);
    });

    expect(outcome).toMatchObject({ success: false, code: ERROR_CODES.CONFIG.NOT_FOUND });
    expect(reload).not.toHaveBeenCalled();
    expect(result.current.pendingKey).toBeNull();
  });

  it("turns a rejected request into a CONFIG_ACTIVATE_ERROR failure", async () => {
    vi.mocked(activateConnection).mockRejectedValue(new Error("network"));
    const reload = vi.fn();
    const { result } = renderHook(() => useActivateConnection(reload));

    let outcome: Awaited<ReturnType<typeof result.current.activate>> | undefined;
    await act(async () => {
      outcome = await result.current.activate(CONNECTION);
    });

    expect(outcome).toMatchObject({ success: false, code: ERROR_CODES.CONFIG.ACTIVATE_ERROR });
    expect(reload).not.toHaveBeenCalled();
  });
});
