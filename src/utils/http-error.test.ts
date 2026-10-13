import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

import { codeForHttpStatus, isConnectionError } from "./http-error";

const KOMGA_CODES = {
  UNAUTHORIZED: ERROR_CODES.KOMGA.UNAUTHORIZED,
  FORBIDDEN: ERROR_CODES.KOMGA.FORBIDDEN,
  NOT_FOUND: ERROR_CODES.KOMGA.NOT_FOUND,
  SERVER_ERROR: ERROR_CODES.KOMGA.SERVER_ERROR,
  HTTP_ERROR: ERROR_CODES.KOMGA.HTTP_ERROR,
};

describe("codeForHttpStatus", () => {
  it("maps auth-related statuses to the provider codes", () => {
    expect(codeForHttpStatus(401, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.UNAUTHORIZED);
    expect(codeForHttpStatus(403, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.FORBIDDEN);
    expect(codeForHttpStatus(404, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.NOT_FOUND);
  });

  it("maps every 5xx to the server error code", () => {
    expect(codeForHttpStatus(500, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.SERVER_ERROR);
    expect(codeForHttpStatus(503, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.SERVER_ERROR);
  });

  it("falls back to the generic HTTP error code", () => {
    expect(codeForHttpStatus(400, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.HTTP_ERROR);
    expect(codeForHttpStatus(418, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.HTTP_ERROR);
    expect(codeForHttpStatus(302, KOMGA_CODES)).toBe(ERROR_CODES.KOMGA.HTTP_ERROR);
  });
});

describe("isConnectionError", () => {
  it("returns false for non-objects", () => {
    expect(isConnectionError(null)).toBe(false);
    expect(isConnectionError(undefined)).toBe(false);
    expect(isConnectionError("ECONNREFUSED")).toBe(false);
    expect(isConnectionError(42)).toBe(false);
  });

  it("detects known socket and DNS error codes", () => {
    expect(isConnectionError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isConnectionError({ code: "ENOTFOUND" })).toBe(true);
    expect(isConnectionError({ code: "UND_ERR_CONNECT_TIMEOUT" })).toBe(true);
  });

  it("detects 'fetch failed' messages", () => {
    expect(isConnectionError({ message: "TypeError: fetch failed" })).toBe(true);
  });

  it("walks nested cause and originalError chains", () => {
    expect(isConnectionError({ cause: { code: "ENOTFOUND" } })).toBe(true);
    expect(isConnectionError({ originalError: { cause: { code: "ETIMEDOUT" } } })).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(isConnectionError({})).toBe(false);
    expect(isConnectionError({ code: "SOMETHING_ELSE" })).toBe(false);
    expect(isConnectionError({ message: "boom" })).toBe(false);
  });
});
