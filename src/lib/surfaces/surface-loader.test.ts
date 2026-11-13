import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { defaultPreferences, type UserPreferences } from "@/types/preferences";
import {
  createProviderCapabilities,
  type IMediaProvider,
  type ProviderCapabilityKey,
} from "@/lib/providers/provider.interface";
import {
  loadSurfaceWithDependencies,
  type LoadSurfaceOptions,
  type SurfaceContext,
  type SurfaceLoaderDependencies,
} from "./surface-loader";

const provider = {
  id: "provider",
  capabilities: createProviderCapabilities(),
} as unknown as IMediaProvider;

function dependencies(
  overrides: Partial<SurfaceLoaderDependencies> = {}
): SurfaceLoaderDependencies {
  return {
    getCurrentUserId: vi.fn(async (): Promise<number | null> => 42),
    getProvider: vi.fn(async () => provider),
    getPreferences: vi.fn(async () => ({ ...defaultPreferences })),
    redirect: vi.fn((url: string): never => {
      throw new Error(`redirect:${url}`);
    }),
    rethrow: vi.fn(),
    ...overrides,
  };
}

function options<
  T,
  C extends ProviderCapabilityKey | undefined = undefined,
>(
  load: LoadSurfaceOptions<T, C>["load"],
  overrides: Partial<LoadSurfaceOptions<T, C>> = {}
): LoadSurfaceOptions<T, C> {
  return {
    name: "test",
    fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
    load,
    ...overrides,
  };
}

describe("loadSurface", () => {
  it("resolves provider and preferences once, then loads data", async () => {
    const deps = dependencies();
    const load = vi.fn(async () => ({ value: 42 }));

    const result = await loadSurfaceWithDependencies(options(load), deps);

    expect(result).toMatchObject({
      status: "ready",
      data: { value: 42 },
      context: { provider },
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("hands the session user to the loader and to the preferences read", async () => {
    const deps = dependencies();
    const load = vi.fn(async ({ userId }: SurfaceContext) => userId);

    const result = await loadSurfaceWithDependencies(options(load), deps);

    expect(result).toMatchObject({ status: "ready", data: 42, context: { userId: 42 } });
    expect(deps.getPreferences).toHaveBeenCalledWith(42);
  });

  it("treats a missing session as a missing provider without reading preferences", async () => {
    const deps = dependencies({ getCurrentUserId: vi.fn(async () => null) });
    const load = vi.fn();

    const result = await loadSurfaceWithDependencies(
      options(load, { missingProvider: "unavailable" }),
      deps
    );

    expect(result).toEqual({ status: "unavailable", reason: "no-provider" });
    expect(deps.getProvider).not.toHaveBeenCalled();
    expect(deps.getPreferences).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it("redirects to settings when no provider is configured", async () => {
    const deps = dependencies({ getProvider: vi.fn(async () => null) });

    await expect(loadSurfaceWithDependencies(options(async () => null), deps)).rejects.toThrow(
      "redirect:/settings"
    );
  });

  it("can return the unavailable state instead of redirecting", async () => {
    const deps = dependencies({ getProvider: vi.fn(async () => null) });

    const result = await loadSurfaceWithDependencies(
      options(async () => null, { missingProvider: "unavailable" }),
      deps
    );

    expect(result).toEqual({ status: "unavailable", reason: "no-provider" });
  });

  it("short-circuits an anonymous surface without calling load", async () => {
    const deps = dependencies({
      getPreferences: vi.fn(async () => ({ ...defaultPreferences, anonymousMode: true })),
    });
    const load = vi.fn(async () => []);

    const result = await loadSurfaceWithDependencies(options(load, { anonymous: "empty" }), deps);

    expect(result.status).toBe("anonymous-empty");
    expect(load).not.toHaveBeenCalled();
  });

  it("loads an anonymous surface when the page allows it", async () => {
    const deps = dependencies({
      getPreferences: vi.fn(async () => ({ ...defaultPreferences, anonymousMode: true })),
    });
    const load = vi.fn(async () => []);

    const result = await loadSurfaceWithDependencies(options(load), deps);

    expect(result.status).toBe("ready");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("returns unavailable when the provider lacks the required capability", async () => {
    const result = await loadSurfaceWithDependencies(
      options(async () => null, { requireCapability: "ratings" }),
      dependencies()
    );

    expect(result).toEqual({ status: "unavailable", reason: "unsupported-capability" });
  });

  it("hands the capability it required to the loader", async () => {
    const ratings = {
      getReadSeries: vi.fn(async () => ({
        items: [],
        nextCursor: null,
        totalPages: 0,
        totalElements: 0,
      })),
      getSeriesRating: vi.fn(async () => null),
      setSeriesRating: vi.fn(async () => undefined),
      deleteSeriesRating: vi.fn(async () => undefined),
    };
    const withRatings = {
      id: "provider",
      capabilities: createProviderCapabilities({ ratings }),
    } as unknown as IMediaProvider;
    const load = vi.fn(async (context: SurfaceContext<"ratings">) => context.capability);

    const result = await loadSurfaceWithDependencies(
      options(load, { requireCapability: "ratings" }),
      dependencies({ getProvider: vi.fn(async () => withRatings) })
    );

    expect(result.status).toBe("ready");
    expect(load).toHaveBeenCalledWith(expect.objectContaining({ capability: ratings }));
  });

  it("falls back to default preferences without failing the page", async () => {
    const deps = dependencies({
      getPreferences: vi.fn(async () => {
        throw new Error("no session");
      }),
    });
    const load = vi.fn(async (context: { preferences: UserPreferences }) => context.preferences);

    const result = await loadSurfaceWithDependencies(options(load), deps);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.data).toEqual(defaultPreferences);
      expect(result.context.isAnonymous).toBe(false);
    }
  });

  it("maps AppError from the loader to its code", async () => {
    const result = await loadSurfaceWithDependencies(
      options(async () => {
        throw new AppError(ERROR_CODES.LIBRARY.NOT_FOUND);
      }),
      dependencies()
    );

    expect(result).toEqual({ status: "error", code: ERROR_CODES.LIBRARY.NOT_FOUND });
  });

  it("uses the fallback code for an unexpected loader error", async () => {
    const result = await loadSurfaceWithDependencies(
      options(async () => {
        throw new Error("boom");
      }),
      dependencies()
    );

    expect(result).toEqual({ status: "error", code: ERROR_CODES.SERIES.FETCH_ERROR });
  });

  it("redirects when the loader reports missing provider configuration", async () => {
    const deps = dependencies();

    await expect(
      loadSurfaceWithDependencies(
        options(async () => {
          throw new AppError(ERROR_CODES.KOMGA.MISSING_CONFIG);
        }),
        deps
      )
    ).rejects.toThrow("redirect:/settings");
  });

  it("rethrows Next.js control-flow errors from context resolution", async () => {
    const bailout = Object.assign(new Error("Dynamic server usage"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    const deps = dependencies({
      getPreferences: vi.fn(async () => {
        throw bailout;
      }),
      rethrow: vi.fn((error: unknown): never => {
        throw error;
      }),
    });

    await expect(loadSurfaceWithDependencies(options(async () => null), deps)).rejects.toBe(
      bailout
    );
  });

  it("rethrows Next.js control-flow errors from the data loader", async () => {
    const redirectSignal = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/settings;307;",
    });
    const deps = dependencies({
      rethrow: vi.fn((error: unknown): never => {
        throw error;
      }),
    });

    await expect(
      loadSurfaceWithDependencies(
        options(async () => {
          throw redirectSignal;
        }),
        deps
      )
    ).rejects.toBe(redirectSignal);
  });
});
