import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique, userCreate } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: { user: { findUnique: userFindUnique, create: userCreate } },
}));
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async (plain: string, hash: string) => hash === `hash:${plain}`),
    hash: vi.fn(async (plain: string) => `hash:${plain}`),
  },
}));

import { AUTH_RATE_LIMITS, AuthServerService } from "./auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";

// Le limiter mémoire survit entre les tests : chaque test prend ses emails/IP.
let seq = 0;
const unique = (prefix: string) => `${prefix}-${seq++}`;

const GOOD = "Corr3ctPassword";

function user(email: string) {
  return { id: 7, email, password: `hash:${GOOD}`, roles: ["ROLE_USER"], sessionVersion: 3 };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthServerService.loginUser", () => {
  it("returns the session version with the user", async () => {
    const email = `${unique("ok")}@example.com`;
    userFindUnique.mockResolvedValue(user(email));

    await expect(AuthServerService.loginUser(email, GOOD, null)).resolves.toMatchObject({
      id: "7",
      sessionVersion: 3,
    });
  });

  it("only counts failed passwords against the email budget", async () => {
    const email = `${unique("victim")}@example.com`;
    userFindUnique.mockResolvedValue(user(email));
    const { limit } = AUTH_RATE_LIMITS.loginFailuresPerEmail;

    // Des connexions réussies ne consomment pas le budget de l'email.
    for (let i = 0; i < limit + 5; i++) {
      await expect(AuthServerService.loginUser(email, GOOD, null)).resolves.toBeDefined();
    }

    for (let i = 0; i < limit; i++) {
      await expect(AuthServerService.loginUser(email, "wrong", null)).rejects.toMatchObject({
        code: ERROR_CODES.AUTH.INVALID_CREDENTIALS,
      });
    }

    // Verrouillé : même le bon mot de passe est refusé avant d'être vérifié.
    await expect(AuthServerService.loginUser(email, GOOD, null)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH.RATE_LIMITED,
    });
  });

  it("counts unknown accounts as failures too", async () => {
    const email = `${unique("ghost")}@example.com`;
    userFindUnique.mockResolvedValue(null);
    const { limit } = AUTH_RATE_LIMITS.loginFailuresPerEmail;

    for (let i = 0; i < limit; i++) {
      await expect(AuthServerService.loginUser(email, "x", null)).rejects.toMatchObject({
        code: ERROR_CODES.AUTH.INVALID_CREDENTIALS,
      });
    }
    await expect(AuthServerService.loginUser(email, "x", null)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH.RATE_LIMITED,
    });
  });

  it("bounds every attempt per client IP, across accounts", async () => {
    const ip = `198.51.100.${seq++ % 250}`;
    userFindUnique.mockResolvedValue(null);
    const { limit } = AUTH_RATE_LIMITS.loginPerIp;

    for (let i = 0; i < limit; i++) {
      await expect(
        AuthServerService.loginUser(`${unique("spray")}@example.com`, "x", ip)
      ).rejects.toMatchObject({ code: ERROR_CODES.AUTH.INVALID_CREDENTIALS });
    }
    await expect(
      AuthServerService.loginUser(`${unique("spray")}@example.com`, "x", ip)
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH.RATE_LIMITED });
  });
});

describe("AuthServerService.registerUser", () => {
  it("bounds registrations per client IP", async () => {
    const ip = `192.0.2.${seq++ % 250}`;
    userFindUnique.mockResolvedValue(null);
    userCreate.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    const { limit } = AUTH_RATE_LIMITS.registerPerIp;

    for (let i = 0; i < limit; i++) {
      await AuthServerService.registerUser(`${unique("reg")}@example.com`, GOOD, ip);
    }
    await expect(
      AuthServerService.registerUser(`${unique("reg")}@example.com`, GOOD, ip)
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH.RATE_LIMITED });
  });
});
