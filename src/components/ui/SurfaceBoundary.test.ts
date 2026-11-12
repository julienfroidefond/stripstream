import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { SurfaceContext, SurfaceResult } from "@/lib/surfaces/surface-loader";
import { defaultPreferences } from "@/types/preferences";

vi.mock("@/components/ui/ErrorMessage", () => ({
  ErrorMessage: ({ errorCode }: { errorCode: string }) => `ERROR:${errorCode}`,
}));

import {
  SurfaceBoundary,
  type SurfaceBoundaryProps,
} from "./SurfaceBoundary";

const context: SurfaceContext = {
  provider: { id: "provider" } as unknown as IMediaProvider,
  preferences: defaultPreferences,
  isAnonymous: false,
};

function renderBoundary<T>(props: SurfaceBoundaryProps<T>): string {
  return renderToStaticMarkup(createElement(SurfaceBoundary<T>, props));
}

describe("SurfaceBoundary", () => {
  it("renders the page with the resolved data and context when ready", () => {
    const markup = renderBoundary({
      surface: { status: "ready", data: { value: 42 }, context },
      ready: (data, surfaceContext) =>
        createElement("p", null, `${data.value}:${surfaceContext.isAnonymous}`),
    });

    expect(markup).toBe("<p>42:false</p>");
  });

  it("renders the default error terminal with the gateway code", () => {
    const ready = vi.fn(() => "ready");
    const markup = renderBoundary({
      surface: { status: "error", code: ERROR_CODES.LIBRARY.NOT_FOUND },
      ready,
    });

    expect(markup).toContain(`ERROR:${ERROR_CODES.LIBRARY.NOT_FOUND}`);
    expect(ready).not.toHaveBeenCalled();
  });

  it("lets a surface override the error terminal", () => {
    const markup = renderBoundary({
      surface: { status: "error", code: ERROR_CODES.WALL.FETCH_ERROR },
      ready: () => "ready",
      error: (code) => createElement("p", null, `wall:${code}`),
    });

    expect(markup).toBe(`<p>wall:${ERROR_CODES.WALL.FETCH_ERROR}</p>`);
  });

  it("renders the default unavailable terminal for both reasons", () => {
    const noProvider = renderBoundary<never>({
      surface: { status: "unavailable", reason: "no-provider" },
      ready: () => "ready",
    });
    const unsupported = renderBoundary<never>({
      surface: { status: "unavailable", reason: "unsupported-capability" },
      ready: () => "ready",
    });

    expect(noProvider).toContain(`ERROR:${ERROR_CODES.PROVIDER.NOT_CONFIGURED}`);
    expect(unsupported).toContain(`ERROR:${ERROR_CODES.PROVIDER.UNAVAILABLE}`);
  });

  it("lets a surface override the unavailable terminal", () => {
    const markup = renderBoundary<never>({
      surface: { status: "unavailable", reason: "no-provider" },
      ready: () => "ready",
      unavailable: (reason) => createElement("p", null, `welcome:${reason}`),
    });

    expect(markup).toBe("<p>welcome:no-provider</p>");
  });

  it("renders nothing for anonymous-empty unless the surface provides a terminal", () => {
    const markup = renderBoundary<never>({
      surface: { status: "anonymous-empty", context },
      ready: () => "ready",
    });

    expect(markup).toBe("");
  });

  it("passes the anonymous context to a surface terminal", () => {
    const markup = renderBoundary<never>({
      surface: { status: "anonymous-empty", context },
      ready: () => "ready",
      anonymousEmpty: (surfaceContext) =>
        createElement("p", null, `anonymous:${surfaceContext.isAnonymous}`),
    });

    expect(markup).toBe("<p>anonymous:false</p>");
  });

  it("never calls ready for a terminal surface", () => {
    const ready = vi.fn(() => "ready");
    const surfaces: SurfaceResult<never>[] = [
      { status: "unavailable", reason: "unsupported-capability" },
      { status: "anonymous-empty", context },
      { status: "error", code: ERROR_CODES.SERIES.FETCH_ERROR },
    ];

    for (const surface of surfaces) {
      renderBoundary({ surface, ready });
    }

    expect(ready).not.toHaveBeenCalled();
  });
});
