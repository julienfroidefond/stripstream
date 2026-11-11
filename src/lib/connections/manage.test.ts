import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  komgaFindFirst,
  komgaFindMany,
  komgaCreate,
  komgaUpdate,
  komgaDelete,
  stripstreamFindFirst,
  stripstreamFindMany,
  stripstreamCreate,
  stripstreamUpdate,
  stripstreamDelete,
  getActiveConnectionMock,
  setActiveConnectionMock,
  invalidateConnectionChangeMock,
} = vi.hoisted(() => ({
  komgaFindFirst: vi.fn(),
  komgaFindMany: vi.fn(),
  komgaCreate: vi.fn(),
  komgaUpdate: vi.fn(),
  komgaDelete: vi.fn(),
  stripstreamFindFirst: vi.fn(),
  stripstreamFindMany: vi.fn(),
  stripstreamCreate: vi.fn(),
  stripstreamUpdate: vi.fn(),
  stripstreamDelete: vi.fn(),
  getActiveConnectionMock: vi.fn(),
  setActiveConnectionMock: vi.fn(),
  invalidateConnectionChangeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    komgaConfig: {
      findFirst: komgaFindFirst,
      findMany: komgaFindMany,
      create: komgaCreate,
      update: komgaUpdate,
      delete: komgaDelete,
    },
    stripstreamConfig: {
      findFirst: stripstreamFindFirst,
      findMany: stripstreamFindMany,
      create: stripstreamCreate,
      update: stripstreamUpdate,
      delete: stripstreamDelete,
    },
  },
}));

vi.mock("./active", () => ({
  getActiveConnection: getActiveConnectionMock,
  setActiveConnection: setActiveConnectionMock,
}));

vi.mock("@/lib/cache/invalidation", () => ({
  invalidateConnectionChange: invalidateConnectionChangeMock,
}));

import {
  activateConnection,
  deleteConnection,
  listConnections,
  saveConnection,
} from "./manage";
import { decryptSecret } from "@/lib/credentials";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  getActiveConnectionMock.mockResolvedValue({ provider: "komga", configId: 1 });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("saveConnection", () => {
  it("creates a Komga config with an encrypted Basic auth value", async () => {
    komgaCreate.mockResolvedValue({ id: 11 });

    await expect(
      saveConnection(
        {
          provider: "komga",
          name: " My Komga ",
          url: " http://komga.local/ ",
          username: " alice ",
          password: "secret",
        },
        7
      )
    ).resolves.toEqual({ id: 11 });

    const data = komgaCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: 7,
      name: "My Komga",
      url: "http://komga.local",
      username: "alice",
    });
    expect(decryptSecret(data.authHeader)).toBe(
      Buffer.from("alice:secret").toString("base64")
    );
    expect(invalidateConnectionChangeMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing Komga auth header when no new password is provided", async () => {
    komgaFindFirst.mockResolvedValue({ authHeader: "existing-encrypted" });

    await saveConnection(
      {
        provider: "komga",
        id: 5,
        name: "Komga",
        url: "http://komga.local",
        username: "alice",
      },
      7
    );

    expect(komgaUpdate).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        name: "Komga",
        url: "http://komga.local",
        username: "alice",
        authHeader: "existing-encrypted",
      },
    });
    expect(invalidateConnectionChangeMock).toHaveBeenCalledTimes(1);
  });

  it("rotates the Komga auth header when a new password is provided", async () => {
    komgaFindFirst.mockResolvedValue({ authHeader: "existing-encrypted" });

    await saveConnection(
      {
        provider: "komga",
        id: 5,
        name: "Komga",
        url: "http://komga.local",
        username: "alice",
        password: "new-secret",
      },
      7
    );

    const data = komgaUpdate.mock.calls[0][0].data;
    expect(data.authHeader).not.toBe("existing-encrypted");
    expect(decryptSecret(data.authHeader)).toBe(
      Buffer.from("alice:new-secret").toString("base64")
    );
  });

  it("returns null when the Komga config to update is not owned by the user", async () => {
    komgaFindFirst.mockResolvedValue(null);

    await expect(
      saveConnection(
        {
          provider: "komga",
          id: 5,
          name: "Komga",
          url: "http://komga.local",
          username: "alice",
        },
        7
      )
    ).resolves.toBeNull();
    expect(komgaUpdate).not.toHaveBeenCalled();
    expect(invalidateConnectionChangeMock).not.toHaveBeenCalled();
  });

  it("creates a Stripstream config with a trimmed, encrypted token", async () => {
    stripstreamCreate.mockResolvedValue({ id: 12 });

    await saveConnection(
      {
        provider: "stripstream",
        name: "Stream",
        url: "http://stream.local/",
        token: "  token  ",
      },
      7
    );

    const data = stripstreamCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: 7,
      name: "Stream",
      url: "http://stream.local",
    });
    expect(decryptSecret(data.token)).toBe("token");
  });

  it("keeps the existing Stripstream token when the update field is blank", async () => {
    stripstreamFindFirst.mockResolvedValue({ token: "existing-token" });

    await saveConnection(
      {
        provider: "stripstream",
        id: 6,
        name: "Stream",
        url: "http://stream.local",
        token: "   ",
      },
      7
    );

    expect(stripstreamUpdate).toHaveBeenCalledWith({
      where: { id: 6 },
      data: {
        name: "Stream",
        url: "http://stream.local",
        token: "existing-token",
      },
    });
  });
});

describe("deleteConnection", () => {
  it("does not invalidate anything when the config is not owned", async () => {
    komgaFindFirst.mockResolvedValue(null);

    await expect(deleteConnection("komga", 5, 7)).resolves.toBe(false);
    expect(komgaDelete).not.toHaveBeenCalled();
    expect(invalidateConnectionChangeMock).not.toHaveBeenCalled();
  });

  it("deletes an owned config and expires connection-derived data", async () => {
    stripstreamFindFirst.mockResolvedValue({ id: 5 });

    await expect(deleteConnection("stripstream", 5, 7)).resolves.toBe(true);
    expect(stripstreamDelete).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(invalidateConnectionChangeMock).toHaveBeenCalledTimes(1);
  });
});

describe("activateConnection", () => {
  it("writes the cookie selection and invalidates caches", async () => {
    komgaFindFirst.mockResolvedValue({ id: 5, name: "Komga perso" });

    await expect(activateConnection("komga", 5, 7)).resolves.toEqual({
      id: 5,
      name: "Komga perso",
    });
    expect(setActiveConnectionMock).toHaveBeenCalledWith("komga", 5);
    expect(invalidateConnectionChangeMock).toHaveBeenCalledTimes(1);
  });

  it("returns null without touching cookies when the config does not exist", async () => {
    stripstreamFindFirst.mockResolvedValue(null);

    await expect(activateConnection("stripstream", 5, 7)).resolves.toBeNull();
    expect(setActiveConnectionMock).not.toHaveBeenCalled();
    expect(invalidateConnectionChangeMock).not.toHaveBeenCalled();
  });
});

describe("listConnections", () => {
  it("marks the selected config across both providers", async () => {
    komgaFindMany.mockResolvedValue([
      { id: 1, name: "Komga A", url: "http://a", username: "alice" },
    ]);
    stripstreamFindMany.mockResolvedValue([
      { id: 2, name: "Stream B", url: "http://b" },
    ]);
    getActiveConnectionMock.mockResolvedValue({ provider: "stripstream", configId: 2 });

    await expect(listConnections(7)).resolves.toEqual({
      komga: [{ id: 1, name: "Komga A", url: "http://a", username: "alice", isActive: false }],
      stripstream: [{ id: 2, name: "Stream B", url: "http://b", isActive: true }],
    });
  });
});
