import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";
import { SIGN_IN_CODES, signInErrorCode } from "./sign-in-codes";

describe("signInErrorCode", () => {
  it("tells a throttled sign-in apart from wrong credentials", () => {
    expect(signInErrorCode(SIGN_IN_CODES.rateLimited)).toBe(ERROR_CODES.AUTH.RATE_LIMITED);
  });

  it("falls back to invalid credentials for any other code", () => {
    expect(signInErrorCode("credentials")).toBe(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    expect(signInErrorCode(undefined)).toBe(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
  });
});
