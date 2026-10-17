import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { warnMock } = vi.hoisted(() => ({ warnMock: vi.fn() }));

vi.mock("./logger", () => ({
  default: { warn: warnMock, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  buildKomgaAuthHeader,
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  isEncryptionConfigured,
} from "./credentials";
import { AppError } from "../utils/errors";

// Clé déterministe de 32 octets (base64) pour les tests.
const VALID_KEY = Buffer.alloc(32, 7).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 9).toString("base64");

describe("credentials", () => {
  beforeEach(() => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", VALID_KEY);
    warnMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("isEncryptionConfigured", () => {
    it("reports false without a key and true with one", () => {
      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "");
      expect(isEncryptionConfigured()).toBe(false);

      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", VALID_KEY);
      expect(isEncryptionConfigured()).toBe(true);
    });
  });

  describe("encryptSecret / decryptSecret", () => {
    it("round-trips a secret", () => {
      const ciphertext = encryptSecret("user:pass");

      expect(ciphertext.startsWith("enc:v1:")).toBe(true);
      expect(ciphertext).not.toContain("user:pass");
      expect(decryptSecret(ciphertext)).toBe("user:pass");
    });

    it("uses a fresh IV so the same plaintext yields different ciphertexts", () => {
      const first = encryptSecret("same");
      const second = encryptSecret("same");

      expect(first).not.toBe(second);
      expect(decryptSecret(first)).toBe("same");
      expect(decryptSecret(second)).toBe("same");
    });

    it("round-trips unicode and empty strings", () => {
      expect(decryptSecret(encryptSecret(""))).toBe("");
      expect(decryptSecret(encryptSecret("clé-🔐-accents"))).toBe("clé-🔐-accents");
    });

    it("accepts a 64-character hex key", () => {
      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "ab".repeat(32));

      expect(decryptSecret(encryptSecret("hex-keyed"))).toBe("hex-keyed");
    });

    it("is idempotent-safe: encrypting a ciphertext is still decryptable", () => {
      const once = encryptSecret("token");
      const twice = encryptSecret(once);

      expect(decryptSecret(twice)).toBe(once);
    });
  });

  describe("legacy plaintext passthrough", () => {
    it("returns a value without the envelope unchanged", () => {
      expect(decryptSecret("dXNlcjpwYXNz")).toBe("dXNlcjpwYXNz");
      expect(decryptSecret("stl_prefix_secret")).toBe("stl_prefix_secret");
      expect(decryptSecret("Basic dXNlcjpwYXNz")).toBe("Basic dXNlcjpwYXNz");
    });

    it("isEncryptedSecret only matches the envelope", () => {
      expect(isEncryptedSecret("enc:v1:a:b:c")).toBe(true);
      expect(isEncryptedSecret("dXNlcjpwYXNz")).toBe(false);
      expect(isEncryptedSecret("Basic dXNlcjpwYXNz")).toBe(false);
    });
  });

  describe("degraded mode without a key", () => {
    beforeEach(() => {
      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "");
    });

    it("stores plaintext and warns", () => {
      expect(encryptSecret("secret")).toBe("secret");
      expect(encryptSecret("secret-again")).toBe("secret-again");

      expect(warnMock).toHaveBeenCalledTimes(2);
    });

    it("still reads legacy plaintext values", () => {
      expect(decryptSecret("dXNlcjpwYXNz")).toBe("dXNlcjpwYXNz");
    });

    it("refuses to read an encrypted value instead of failing silently", () => {
      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", VALID_KEY);
      const ciphertext = encryptSecret("secret");
      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "");

      expect(() => decryptSecret(ciphertext)).toThrowError(AppError);
    });
  });

  describe("invalid key", () => {
    it("rejects a key that is not 32 bytes", () => {
      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "too-short");

      expect(() => encryptSecret("secret")).toThrowError(AppError);
    });

    it("rejects a malformed envelope", () => {
      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", VALID_KEY);

      expect(() => decryptSecret("enc:v1:not-base64")).toThrowError(AppError);
    });

    it("rejects a ciphertext tampered with or encrypted with another key", () => {
      const ciphertext = encryptSecret("secret");

      expect(() => decryptSecret(`${ciphertext}tampered`)).toThrowError(AppError);

      vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", OTHER_KEY);
      expect(() => decryptSecret(ciphertext)).toThrowError(AppError);
    });
  });

  describe("buildKomgaAuthHeader", () => {
    it("base64-encodes user:password for the wire", () => {
      expect(buildKomgaAuthHeader("user", "pass")).toBe(
        Buffer.from("user:pass").toString("base64")
      );
    });
  });
});
