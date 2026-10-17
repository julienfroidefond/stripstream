import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { planCredentialEncryption } from "./credentials-migration";
import { decryptSecret, encryptSecret } from "./credentials";

const VALID_KEY = Buffer.alloc(32, 3).toString("base64");

describe("planCredentialEncryption", () => {
  beforeEach(() => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("plans an encryption for plaintext rows", () => {
    const plan = planCredentialEncryption([
      { id: 1, value: "dXNlcjpwYXNz" },
      { id: 2, value: "stl_prefix_secret" },
    ]);

    expect(plan.enabled).toBe(true);
    expect(plan.alreadyEncrypted).toBe(0);
    expect(plan.pendingWithoutKey).toBe(0);
    expect(plan.updates.map((update) => update.id)).toEqual([1, 2]);
    expect(plan.updates.every((update) => update.value.startsWith("enc:v1:"))).toBe(true);
    expect(decryptSecret(plan.updates[0].value)).toBe("dXNlcjpwYXNz");
    expect(decryptSecret(plan.updates[1].value)).toBe("stl_prefix_secret");
  });

  it("skips rows already encrypted so the migration is idempotent", () => {
    const ciphertext = encryptSecret("dXNlcjpwYXNz");

    const firstRun = planCredentialEncryption([{ id: 1, value: "dXNlcjpwYXNz" }]);
    const secondRun = planCredentialEncryption([{ id: 1, value: ciphertext }]);

    expect(firstRun.updates).toHaveLength(1);
    expect(secondRun.updates).toHaveLength(0);
    expect(secondRun.alreadyEncrypted).toBe(1);
  });

  it("leaves everything untouched when no key is configured", () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "");

    const plan = planCredentialEncryption([
      { id: 1, value: "plaintext" },
      { id: 2, value: "enc:v1:a:b:c" },
    ]);

    expect(plan.enabled).toBe(false);
    expect(plan.updates).toEqual([]);
    expect(plan.pendingWithoutKey).toBe(1);
    expect(plan.alreadyEncrypted).toBe(1);
  });

  it("returns an empty plan for an empty table", () => {
    expect(planCredentialEncryption([])).toEqual({
      enabled: true,
      updates: [],
      alreadyEncrypted: 0,
      pendingWithoutKey: 0,
    });
  });
});
