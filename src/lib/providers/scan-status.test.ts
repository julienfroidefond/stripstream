import { describe, expect, it } from "vitest";

import { scanStateFromIndexJobStatus } from "./scan-status";

describe("scanStateFromIndexJobStatus", () => {
  it.each([
    ["pending"],
    ["queued"],
    ["running"],
    ["processing"],
    ["extracting_pages"],
    ["generating_thumbnails"],
  ])("maps %s to running", (status) => {
    expect(scanStateFromIndexJobStatus(status)).toBe("running");
  });

  it.each([["success"], ["completed"], ["done"]])("maps %s to completed", (status) => {
    expect(scanStateFromIndexJobStatus(status)).toBe("completed");
  });

  it.each([["failed"], ["error"]])("maps %s to failed", (status) => {
    expect(scanStateFromIndexJobStatus(status)).toBe("failed");
  });

  it.each([["cancelled"], ["canceled"]])("maps %s to cancelled", (status) => {
    expect(scanStateFromIndexJobStatus(status)).toBe("cancelled");
  });

  it("is case and whitespace insensitive", () => {
    expect(scanStateFromIndexJobStatus(" SUCCESS ")).toBe("completed");
  });

  it("degrades unknown or missing statuses to unavailable", () => {
    expect(scanStateFromIndexJobStatus("teleporting")).toBe("unavailable");
    expect(scanStateFromIndexJobStatus(null)).toBe("unavailable");
    expect(scanStateFromIndexJobStatus(undefined)).toBe("unavailable");
    expect(scanStateFromIndexJobStatus("")).toBe("unavailable");
  });
});
