import { describe, expect, it } from "vitest";

import en from "@/i18n/messages/en/common.json";
import fr from "@/i18n/messages/fr/common.json";

import { ERROR_CODES, type ErrorCode } from "./errorCodes";
import { ERROR_MESSAGES } from "./errorMessages";

const ALL_CODES = Object.values(ERROR_CODES).flatMap((group) =>
  Object.values(group)
) as ErrorCode[];

/** Libellés localisés qui ne portent pas de code (repli d'affichage). */
const LOCALIZED_ONLY_KEYS = ["GENERIC_ERROR"];

describe("ERROR_MESSAGES", () => {
  it("has a technical message for every error code", () => {
    const missing = ALL_CODES.filter((code) => typeof ERROR_MESSAGES[code] !== "string");

    expect(missing).toEqual([]);
  });

  it("never ships an empty or padded message", () => {
    const invalid = ALL_CODES.filter((code) => {
      const message = ERROR_MESSAGES[code];
      return message.trim().length === 0 || message !== message.trim();
    });

    expect(invalid).toEqual([]);
  });

  it("only contains messages attached to a declared code", () => {
    const orphans = Object.keys(ERROR_MESSAGES).filter(
      (code) => !ALL_CODES.includes(code as ErrorCode)
    );

    expect(orphans).toEqual([]);
  });
});

describe("localized error copy", () => {
  it.each([
    ["en", en.errors],
    ["fr", fr.errors],
  ])("covers every code in %s", (_locale, errors) => {
    const keys = new Set(Object.keys(errors));
    const expected = [...ALL_CODES, ...LOCALIZED_ONLY_KEYS];

    expect(expected.filter((key) => !keys.has(key))).toEqual([]);
  });

  it.each([
    ["en", en.errors],
    ["fr", fr.errors],
  ])("declares no key besides codes and display fallbacks in %s", (_locale, errors) => {
    const allowed = new Set<string>([...ALL_CODES, ...LOCALIZED_ONLY_KEYS]);
    const orphans = Object.keys(errors).filter((key) => !allowed.has(key));

    expect(orphans).toEqual([]);
  });

  it("keeps the en and fr key sets identical", () => {
    expect(Object.keys(en.errors).sort()).toEqual(Object.keys(fr.errors).sort());
  });
});
