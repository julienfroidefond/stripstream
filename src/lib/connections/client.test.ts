import { describe, expect, it } from "vitest";
import {
  connectionKey,
  connectionSlug,
  emptyConnectionLists,
  findActiveConnection,
  toUnifiedConnections,
} from "./client";

describe("toUnifiedConnections", () => {
  it("merges every provider list in registry order and exposes non-secret fields", () => {
    const connections = toUnifiedConnections({
      komga: [
        { id: 1, name: "Komga A", url: "http://a", username: "alice", isActive: false },
        { id: 2, name: "Komga B", url: "http://b", username: "bob", isActive: false },
      ],
      stripstream: [{ id: 1, name: "Stream", url: "http://s", isActive: true }],
    });

    expect(connections).toEqual([
      {
        key: "komga-1",
        provider: "komga",
        id: 1,
        name: "Komga A",
        url: "http://a",
        isActive: false,
        fields: { username: "alice" },
      },
      {
        key: "komga-2",
        provider: "komga",
        id: 2,
        name: "Komga B",
        url: "http://b",
        isActive: false,
        fields: { username: "bob" },
      },
      {
        key: "stripstream-1",
        provider: "stripstream",
        id: 1,
        name: "Stream",
        url: "http://s",
        isActive: true,
        fields: {},
      },
    ]);
    // Même id, providers différents : les clés restent distinctes.
    expect(new Set(connections.map((c) => c.key)).size).toBe(3);
    expect(findActiveConnection(connections)?.key).toBe("stripstream-1");
  });

  it("returns an empty list for empty lists, with no active connection", () => {
    const connections = toUnifiedConnections(emptyConnectionLists());
    expect(connections).toEqual([]);
    expect(findActiveConnection(connections)).toBeUndefined();
  });
});

describe("connection identifiers", () => {
  it("builds the key and the test-id slug used by the E2E suite", () => {
    expect(connectionKey({ provider: "komga", id: 4 })).toBe("komga-4");
    expect(connectionSlug("Stub A")).toBe("stub-a");
    expect(connectionSlug("E2E mutable connection")).toBe("e2e-mutable-connection");
  });

  it("has one empty list per provider", () => {
    expect(emptyConnectionLists()).toEqual({ komga: [], stripstream: [] });
  });
});
