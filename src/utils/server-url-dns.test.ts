import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { assertServerUrlResolvesSafely } from "./server-url-dns";

const resolvingTo = (...addresses: string[]) => vi.fn(async () => addresses);

describe("assertServerUrlResolvesSafely", () => {
  it.each([
    ["link-local metadata", "169.254.169.254"],
    ["Alibaba metadata", "100.100.100.200"],
    ["AWS IPv6 metadata", "fd00:ec2::254"],
    ["IPv4-mapped metadata", "::ffff:169.254.169.254"],
  ])("refuses a name resolving to %s", async (_label, address) => {
    await expect(
      assertServerUrlResolvesSafely("https://komga.example.com", resolvingTo("10.0.0.5", address))
    ).rejects.toMatchObject({ code: ERROR_CODES.CONFIG.INVALID_URL });
  });

  it("allows loopback and LAN servers, the normal self-hosted setup", async () => {
    await expect(
      assertServerUrlResolvesSafely("http://127.0.0.1:8444", resolvingTo("127.0.0.1"))
    ).resolves.toBeUndefined();
    await expect(
      assertServerUrlResolvesSafely("http://nas.lan", resolvingTo("192.168.1.10", "fe80::1"))
    ).resolves.toBeUndefined();
  });

  it("resolves the bare hostname, IPv6 brackets removed", async () => {
    const resolve = resolvingTo("::1");
    await assertServerUrlResolvesSafely("http://[::1]:25600/komga", resolve);
    expect(resolve).toHaveBeenCalledWith("::1");
  });

  it("does not refuse a name that does not resolve (the test will fail on its own)", async () => {
    const resolve = vi.fn(async () => {
      throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
    });
    await expect(
      assertServerUrlResolvesSafely("http://unknown.invalid", resolve)
    ).resolves.toBeUndefined();
  });
});
