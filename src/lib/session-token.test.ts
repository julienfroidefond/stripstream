import { describe, expect, it, vi } from "vitest";
import { revalidateSessionToken, rolesFromToken } from "./session-token";

const ADMIN = JSON.stringify(["ROLE_USER", "ROLE_ADMIN"]);

describe("revalidateSessionToken", () => {
  it("refreshes the roles from the database on every read", async () => {
    const loadUser = vi.fn().mockResolvedValue({ roles: ["ROLE_USER"], sessionVersion: 0 });

    const token = await revalidateSessionToken({ sub: "7", roles: ADMIN, sessionVersion: 0 }, loadUser);

    expect(loadUser).toHaveBeenCalledWith(7);
    expect(token).toEqual({ sub: "7", roles: JSON.stringify(["ROLE_USER"]), sessionVersion: 0 });
  });

  it("closes the session of a deleted user", async () => {
    const loadUser = vi.fn().mockResolvedValue(null);
    await expect(revalidateSessionToken({ sub: "7", roles: ADMIN }, loadUser)).resolves.toBeNull();
  });

  it("closes the session after a password change or reset", async () => {
    const loadUser = vi.fn().mockResolvedValue({ roles: ["ROLE_USER"], sessionVersion: 2 });
    await expect(
      revalidateSessionToken({ sub: "7", roles: ADMIN, sessionVersion: 1 }, loadUser)
    ).resolves.toBeNull();
  });

  it("keeps tokens issued before the column existed (version 0)", async () => {
    const loadUser = vi.fn().mockResolvedValue({ roles: ["ROLE_USER"], sessionVersion: 0 });
    await expect(revalidateSessionToken({ sub: "7", roles: ADMIN }, loadUser)).resolves.toMatchObject({
      sessionVersion: 0,
    });
  });

  it("rejects a token without a usable subject without querying", async () => {
    const loadUser = vi.fn();
    await expect(revalidateSessionToken({ sub: "abc" }, loadUser)).resolves.toBeNull();
    expect(loadUser).not.toHaveBeenCalled();
  });
});

describe("rolesFromToken", () => {
  it("parses the serialized roles and tolerates corrupt values", () => {
    expect(rolesFromToken({ roles: ADMIN })).toEqual(["ROLE_USER", "ROLE_ADMIN"]);
    expect(rolesFromToken({ roles: "{oops" })).toEqual([]);
    expect(rolesFromToken({})).toEqual([]);
  });
});
