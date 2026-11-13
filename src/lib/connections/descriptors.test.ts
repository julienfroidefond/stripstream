import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  CONNECTION_PROVIDERS,
  isConnectionProvider,
  validateConnectionDraft,
  validateConnectionInput,
  validateConnectionRef,
} from "./descriptors";

const invalid = { ok: false, code: ERROR_CODES.CONFIG.INVALID_INPUT };

describe("isConnectionProvider", () => {
  it("accepts declared providers only", () => {
    expect(CONNECTION_PROVIDERS).toEqual(["komga", "stripstream"]);
    expect(isConnectionProvider("komga")).toBe(true);
    expect(isConnectionProvider("stripstream")).toBe(true);
    expect(isConnectionProvider("plex")).toBe(false);
    expect(isConnectionProvider("toString")).toBe(false);
    expect(isConnectionProvider(undefined)).toBe(false);
  });
});

describe("validateConnectionInput", () => {
  it("trims name, URL and non-secret fields, keeps the Komga password verbatim", () => {
    expect(
      validateConnectionInput({
        provider: "komga",
        name: " Maison ",
        url: " http://komga.local ",
        username: " alice ",
        password: " pass ",
      })
    ).toEqual({
      ok: true,
      value: {
        provider: "komga",
        name: "Maison",
        url: "http://komga.local",
        username: "alice",
        password: " pass ",
      },
    });
  });

  it("requires every secret on creation", () => {
    expect(
      validateConnectionInput({ provider: "komga", name: "K", url: "http://k", username: "a" })
    ).toEqual(invalid);
    expect(
      validateConnectionInput({ provider: "stripstream", name: "S", url: "http://s", token: "  " })
    ).toEqual(invalid);
  });

  it("omits a blank secret on update so the stored one is kept", () => {
    expect(
      validateConnectionInput({
        provider: "stripstream",
        id: 4,
        name: "S",
        url: "http://s",
        token: "   ",
      })
    ).toEqual({ ok: true, value: { provider: "stripstream", id: 4, name: "S", url: "http://s" } });
  });

  it("still requires an always-required field on update", () => {
    expect(
      validateConnectionInput({ provider: "komga", id: 4, name: "K", url: "http://k", username: " " })
    ).toEqual(invalid);
  });

  it.each([
    ["a non-object", null],
    ["an unknown provider", { provider: "plex", name: "P", url: "http://p" }],
    ["a missing name", { provider: "stripstream", name: " ", url: "http://s", token: "t" }],
    ["a missing URL", { provider: "stripstream", name: "S", token: "t" }],
    ["a non-positive id", { provider: "stripstream", id: 0, name: "S", url: "http://s" }],
    ["a non-string field", { provider: "stripstream", name: "S", url: "http://s", token: 42 }],
  ])("rejects %s", (_label, raw) => {
    expect(validateConnectionInput(raw)).toEqual(invalid);
  });
});

describe("validateConnectionDraft", () => {
  it("requires the URL and every secret, but no name", () => {
    expect(
      validateConnectionDraft({ provider: "stripstream", url: " http://s ", token: " t " })
    ).toEqual({ ok: true, value: { provider: "stripstream", url: "http://s", token: "t" } });
    expect(validateConnectionDraft({ provider: "komga", url: "http://k", username: "a" })).toEqual(
      invalid
    );
    expect(validateConnectionDraft({ provider: "stripstream", url: "", token: "t" })).toEqual(
      invalid
    );
  });
});

describe("validateConnectionRef", () => {
  it("accepts a declared provider and a positive integer id", () => {
    expect(validateConnectionRef({ provider: "komga", id: 3 })).toEqual({
      ok: true,
      value: { provider: "komga", id: 3 },
    });
    expect(validateConnectionRef({ provider: "komga", id: 1.5 })).toEqual(invalid);
    expect(validateConnectionRef({ provider: "nope", id: 3 })).toEqual(invalid);
  });
});
