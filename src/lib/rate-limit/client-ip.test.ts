import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "./client-ip";

describe("clientIpFromHeaders", () => {
  it("takes the first X-Forwarded-For element", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.2" });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP", () => {
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "2001:DB8::1" }))).toBe("2001:db8::1");
  });

  it("returns null without a usable address", () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "not an ip" }))).toBeNull();
    expect(clientIpFromHeaders(null)).toBeNull();
  });
});
