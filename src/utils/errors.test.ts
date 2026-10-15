import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

import { AppError, getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("returns the raw message when there are no params", () => {
    expect(getErrorMessage(ERROR_CODES.AUTH.UNAUTHENTICATED)).toBe("User not authenticated");
  });

  it("interpolates a single parameter", () => {
    expect(getErrorMessage(ERROR_CODES.LIBRARY.NOT_FOUND, { libraryId: "42" })).toBe(
      "Library 42 not found"
    );
  });

  it("interpolates several distinct parameters", () => {
    expect(
      getErrorMessage(ERROR_CODES.KOMGA.HTTP_ERROR, { status: 404, statusText: "Not Found" })
    ).toBe("HTTP Error: 404 Not Found");
  });

  it("stringifies non-string parameters", () => {
    expect(getErrorMessage(ERROR_CODES.KOMGA.SERVER_ERROR, { status: 503 })).toBe(
      "Komga server error (HTTP 503). Try again later or check the server status."
    );
  });

  it("leaves unknown placeholders untouched", () => {
    expect(getErrorMessage(ERROR_CODES.LIBRARY.NOT_FOUND, { other: "x" })).toBe(
      "Library {libraryId} not found"
    );
  });
});

describe("AppError", () => {
  it("builds the localized message and sets the code and name", () => {
    const error = new AppError(ERROR_CODES.KOMGA.NOT_FOUND);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe(ERROR_CODES.KOMGA.NOT_FOUND);
    expect(error.message).toBe(
      "Komga resource not found (HTTP 404). The server URL might be wrong."
    );
  });

  it("defaults params to an empty object", () => {
    expect(new AppError(ERROR_CODES.HOME.FETCH_ERROR).params).toEqual({});
  });

  it("keeps the params and the original error", () => {
    const cause = new Error("boom");
    const error = new AppError(ERROR_CODES.KOMGA.HTTP_ERROR, { status: 500 }, cause);

    expect(error.params).toEqual({ status: 500 });
    expect(error.originalError).toBe(cause);
    expect(error.message).toBe("HTTP Error: 500 {statusText}");
  });
});
