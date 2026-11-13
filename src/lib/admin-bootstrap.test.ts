import { describe, expect, it } from "vitest";
import { planAdminBootstrap } from "./admin-bootstrap";

describe("planAdminBootstrap", () => {
  it("never touches an existing account, whatever the password", () => {
    expect(planAdminBootstrap({ adminExists: true, password: undefined })).toEqual({
      action: "keep",
    });
    expect(planAdminBootstrap({ adminExists: true, password: "Another#Pass1" })).toEqual({
      action: "keep",
    });
  });

  it("refuses to create the admin without an explicit password", () => {
    expect(planAdminBootstrap({ adminExists: false, password: undefined })).toEqual({
      action: "refuse",
      reason: "missing-password",
    });
    expect(planAdminBootstrap({ adminExists: false, password: "   " })).toEqual({
      action: "refuse",
      reason: "missing-password",
    });
  });

  it("refuses a password that is too short", () => {
    expect(planAdminBootstrap({ adminExists: false, password: "short" })).toEqual({
      action: "refuse",
      reason: "weak-password",
    });
  });

  it("creates the admin with the provided password", () => {
    expect(planAdminBootstrap({ adminExists: false, password: "Sup3r-secret" })).toEqual({
      action: "create",
      password: "Sup3r-secret",
    });
  });
});
