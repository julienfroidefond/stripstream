import { describe, expect, it } from "vitest";

import { AppError } from "./errors";
import { normalizeServerUrl } from "./server-url";

function expectInvalid(value: string) {
  expect(() => normalizeServerUrl(value)).toThrow(AppError);
}

describe("normalizeServerUrl", () => {
  it("accepts self-hosted http(s) servers and removes trailing slashes", () => {
    expect(normalizeServerUrl("http://localhost:25600/")).toBe("http://localhost:25600");
    expect(normalizeServerUrl(" http://127.0.0.1:8080 ")).toBe("http://127.0.0.1:8080");
    expect(normalizeServerUrl("https://komga.example.com/komga/")).toBe(
      "https://komga.example.com/komga"
    );
  });

  it("rejects non-http protocols", () => {
    expectInvalid("file:///etc/passwd");
    expectInvalid("ftp://example.com");
    expectInvalid("gopher://example.com");
  });

  it("rejects URLs with embedded credentials, query or fragment", () => {
    expectInvalid("http://user:pass@example.com");
    expectInvalid("http://example.com?target=internal");
    expectInvalid("http://example.com#fragment");
  });

  it("rejects malformed values", () => {
    expectInvalid("");
    expectInvalid("not a url");
    expectInvalid("//example.com");
  });

  it("rejects cloud metadata endpoints", () => {
    expectInvalid("http://169.254.169.254/latest/meta-data");
    expectInvalid("http://[::ffff:169.254.169.254]/");
    expectInvalid("http://100.100.100.200/latest/meta-data");
    expectInvalid("http://[fd00:ec2::254]/");
    expectInvalid("http://metadata.google.internal/computeMetadata/v1");
  });
});
