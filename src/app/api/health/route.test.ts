import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: { $queryRaw: queryRaw } }));
vi.mock("@/lib/logger", () => ({ default: { error: vi.fn() } }));

import { GET } from "./route";

beforeEach(() => {
  queryRaw.mockReset();
});

describe("GET /api/health", () => {
  it("answers 200 when the database responds", async () => {
    queryRaw.mockResolvedValue([{ 1: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers 503 without leaking the error when the database is down", async () => {
    queryRaw.mockRejectedValue(new Error("SQLITE_CANTOPEN: /app/prisma/data/stripstream.db"));

    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ status: "unavailable" });
    expect(body).not.toContain("SQLITE");
  });
});
