import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, trustedProxyHops } from "./client-ip";

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

  it("takes the address written by the trusted proxy when hops are declared", () => {
    // nginx ajoute l'adresse vue à ce que le client a envoyé.
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" });
    expect(clientIpFromHeaders(headers, 1)).toBe("203.0.113.7");
    // CDN puis nginx : deux proxys de confiance.
    const chained = new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7, 198.51.100.2" });
    expect(clientIpFromHeaders(chained, 2)).toBe("203.0.113.7");
  });

  it("trusts no address when the chain is shorter than declared, not even X-Real-IP", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.9" });
    expect(clientIpFromHeaders(headers, 2)).toBeNull();
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.9" }), 1)).toBeNull();
  });

  it("reads TRUSTED_PROXY_HOPS as a positive integer only", () => {
    expect(trustedProxyHops(undefined)).toBeNull();
    expect(trustedProxyHops("0")).toBeNull();
    expect(trustedProxyHops("abc")).toBeNull();
    expect(trustedProxyHops(" 2 ")).toBe(2);
  });
});
