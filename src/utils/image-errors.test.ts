import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

import { AppError } from "./errors";
import { findHttpStatus } from "./image-errors";

describe("findHttpStatus", () => {
  it("returns null for non-AppError values", () => {
    expect(findHttpStatus(null)).toBeNull();
    expect(findHttpStatus(undefined)).toBeNull();
    expect(findHttpStatus(new Error("boom"))).toBeNull();
    expect(findHttpStatus({ code: ERROR_CODES.KOMGA.HTTP_ERROR })).toBeNull();
  });

  it("reads the status from a Komga HTTP error", () => {
    expect(findHttpStatus(new AppError(ERROR_CODES.KOMGA.HTTP_ERROR, { status: 404 }))).toBe(404);
  });

  it("returns null when the HTTP error carries no status", () => {
    expect(findHttpStatus(new AppError(ERROR_CODES.KOMGA.HTTP_ERROR))).toBeNull();
  });

  it("walks the originalError chain to find the HTTP error", () => {
    const root = new AppError(ERROR_CODES.KOMGA.HTTP_ERROR, { status: 503 });
    const wrapped = new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, {}, root);

    expect(findHttpStatus(wrapped)).toBe(503);
  });

  it("returns null when the chain never contains an HTTP error", () => {
    const wrapped = new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, {}, new Error("boom"));
    expect(findHttpStatus(wrapped)).toBeNull();
  });
});
