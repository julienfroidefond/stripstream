import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

vi.mock("@/lib/auth-utils", () => ({
  requireUserId: vi.fn(),
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/providers/provider.factory", () => ({
  getProvider: vi.fn(),
  createProvider: vi.fn(),
}));
vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: { getPreferences: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/connections", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/connections")>()),
  listConnections: vi.fn(),
  saveConnection: vi.fn(),
  deleteConnection: vi.fn(),
  activateConnection: vi.fn(),
  testConnection: vi.fn(),
  testStoredConnection: vi.fn(),
}));

const { requireUserId } = await import("@/lib/auth-utils");
const lib = await import("@/lib/connections");
const actions = await import("./connections");

/** Un utilisateur par test : les budgets de rate-limit en mémoire restent isolés. */
let nextUserId = 5000;
let userId = 0;

beforeEach(() => {
  vi.clearAllMocks();
  userId = nextUserId++;
  vi.mocked(requireUserId).mockResolvedValue(userId);
});

const KOMGA_INPUT = {
  provider: "komga" as const,
  name: "Maison",
  url: "http://komga.local",
  username: "alice",
  password: "secret",
};

describe("gates", () => {
  it.each([
    ["listConnections", () => actions.listConnections()],
    ["saveConnection", () => actions.saveConnection(KOMGA_INPUT)],
    ["deleteConnection", () => actions.deleteConnection({ provider: "komga", id: 1 })],
    ["activateConnection", () => actions.activateConnection({ provider: "komga", id: 1 })],
    ["testConnection", () => actions.testConnection({ stored: { provider: "komga", id: 1 } })],
  ])("%s refuses an anonymous caller before touching connections", async (_name, call) => {
    vi.mocked(requireUserId).mockRejectedValue(new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED));

    expect(await call()).toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.UNAUTHENTICATED,
    });
    for (const fn of [
      lib.listConnections,
      lib.saveConnection,
      lib.deleteConnection,
      lib.activateConnection,
      lib.testStoredConnection,
    ]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("rate-limits connection tests per provider and user, before any probe", async () => {
    vi.mocked(lib.testStoredConnection).mockResolvedValue({ ok: true, libraryCount: 1 });
    const target = { stored: { provider: "komga" as const, id: 1 } };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await actions.testConnection(target)).toMatchObject({ success: true });
    }
    expect(await actions.testConnection(target)).toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.RATE_LIMITED,
      retryAfterSeconds: expect.any(Number),
    });
    expect(lib.testStoredConnection).toHaveBeenCalledTimes(5);

    // L'autre provider garde son propre budget.
    expect(
      await actions.testConnection({ stored: { provider: "stripstream", id: 2 } })
    ).toMatchObject({ success: true });
  });
});

describe("listConnections", () => {
  it("returns the lists of the authenticated user", async () => {
    const lists = { komga: [], stripstream: [] };
    vi.mocked(lib.listConnections).mockResolvedValue(lists);

    expect(await actions.listConnections()).toMatchObject({ success: true, lists });
    expect(lib.listConnections).toHaveBeenCalledWith(userId);
  });

  it("reports a failure with a catalog code instead of an empty list", async () => {
    vi.mocked(lib.listConnections).mockRejectedValue(new Error("db down"));

    const result = await actions.listConnections();
    expect(result).toMatchObject({ success: false, code: ERROR_CODES.CONFIG.FETCH_ERROR });
    expect(result).not.toHaveProperty("lists");
  });
});

describe("saveConnection", () => {
  it("creates a connection and reports it as created", async () => {
    vi.mocked(lib.saveConnection).mockResolvedValue({ id: 9 });

    expect(await actions.saveConnection(KOMGA_INPUT)).toMatchObject({
      success: true,
      id: 9,
      created: true,
    });
    expect(lib.saveConnection).toHaveBeenCalledWith(KOMGA_INPUT, userId);
  });

  it("reports an update when an id is given", async () => {
    vi.mocked(lib.saveConnection).mockResolvedValue({ id: 3 });

    expect(
      await actions.saveConnection({ provider: "stripstream", id: 3, name: "S", url: "http://s" })
    ).toMatchObject({ success: true, created: false });
  });

  it("maps a missing config to CONFIG_NOT_FOUND", async () => {
    vi.mocked(lib.saveConnection).mockResolvedValue(null);

    expect(await actions.saveConnection({ ...KOMGA_INPUT, id: 4 })).toMatchObject({
      success: false,
      code: ERROR_CODES.CONFIG.NOT_FOUND,
    });
  });

  it("maps a duplicate name to CONFIG_DUPLICATE_NAME", async () => {
    vi.mocked(lib.saveConnection).mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" })
    );

    expect(await actions.saveConnection(KOMGA_INPUT)).toMatchObject({
      success: false,
      code: ERROR_CODES.CONFIG.DUPLICATE_NAME,
    });
  });

  it("keeps the validation code raised by the connection module", async () => {
    vi.mocked(lib.saveConnection).mockRejectedValue(
      new AppError(ERROR_CODES.CONFIG.INVALID_INPUT)
    );

    expect(await actions.saveConnection({ ...KOMGA_INPUT, username: "" })).toMatchObject({
      success: false,
      code: ERROR_CODES.CONFIG.INVALID_INPUT,
    });
  });
});

describe("deleteConnection and activateConnection", () => {
  it("rejects a malformed reference without querying", async () => {
    const bad = { provider: "plex", id: 1 } as unknown as { provider: "komga"; id: number };

    expect(await actions.deleteConnection(bad)).toMatchObject({
      success: false,
      code: ERROR_CODES.CONFIG.INVALID_INPUT,
    });
    expect(await actions.activateConnection({ provider: "komga", id: -1 })).toMatchObject({
      success: false,
      code: ERROR_CODES.CONFIG.INVALID_INPUT,
    });
    expect(lib.deleteConnection).not.toHaveBeenCalled();
    expect(lib.activateConnection).not.toHaveBeenCalled();
  });

  it("deletes an owned config and maps an unknown one to CONFIG_NOT_FOUND", async () => {
    vi.mocked(lib.deleteConnection).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect(await actions.deleteConnection({ provider: "stripstream", id: 2 })).toMatchObject({
      success: true,
    });
    expect(lib.deleteConnection).toHaveBeenCalledWith("stripstream", 2, userId);
    expect(await actions.deleteConnection({ provider: "stripstream", id: 2 })).toMatchObject({
      success: false,
      code: ERROR_CODES.CONFIG.NOT_FOUND,
    });
  });

  it("activates a config and returns its name", async () => {
    vi.mocked(lib.activateConnection).mockResolvedValue({ id: 5, name: "Maison" });

    expect(await actions.activateConnection({ provider: "komga", id: 5 })).toMatchObject({
      success: true,
      name: "Maison",
    });
    expect(lib.activateConnection).toHaveBeenCalledWith("komga", 5, userId);
  });
});

describe("testConnection", () => {
  it("tests a draft through an ad hoc connection built by the provider definition", async () => {
    vi.mocked(lib.testConnection).mockResolvedValue({ ok: true, libraryCount: 3 });

    expect(
      await actions.testConnection({
        draft: { provider: "stripstream", url: " http://stream.local/ ", token: " tok " },
      })
    ).toMatchObject({ success: true, libraryCount: 3 });
    expect(lib.testConnection).toHaveBeenCalledWith({
      provider: "stripstream",
      configId: null,
      url: "http://stream.local",
      token: "tok",
      source: "provided",
    });
  });

  it("refuses an incomplete draft without probing", async () => {
    expect(
      await actions.testConnection({
        draft: { provider: "komga", url: "http://komga.local", username: "alice" },
      })
    ).toMatchObject({ success: false, code: ERROR_CODES.CONFIG.INVALID_INPUT });
    expect(lib.testConnection).not.toHaveBeenCalled();
  });

  it("surfaces the provider failure code when the probe reports one", async () => {
    vi.mocked(lib.testStoredConnection).mockResolvedValue({
      ok: false,
      error: "401",
      code: ERROR_CODES.KOMGA.UNAUTHORIZED,
    });

    expect(await actions.testConnection({ stored: { provider: "komga", id: 1 } })).toMatchObject({
      success: false,
      code: ERROR_CODES.KOMGA.UNAUTHORIZED,
    });
  });

  it("falls back to CONFIG_TEST_ERROR and maps a missing config to CONFIG_NOT_FOUND", async () => {
    vi.mocked(lib.testStoredConnection)
      .mockResolvedValueOnce({ ok: false, error: "boom" })
      .mockResolvedValueOnce(null);

    expect(await actions.testConnection({ stored: { provider: "komga", id: 1 } })).toMatchObject({
      code: ERROR_CODES.CONFIG.TEST_ERROR,
    });
    expect(await actions.testConnection({ stored: { provider: "komga", id: 1 } })).toMatchObject({
      code: ERROR_CODES.CONFIG.NOT_FOUND,
    });
  });
});
