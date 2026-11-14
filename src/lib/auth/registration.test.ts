import { describe, expect, it } from "vitest";
import { isRegistrationEnabled } from "./registration";

describe("isRegistrationEnabled", () => {
  it("is closed when the variable is absent or anything but true", () => {
    expect(isRegistrationEnabled({})).toBe(false);
    expect(isRegistrationEnabled({ REGISTRATION_ENABLED: "" })).toBe(false);
    expect(isRegistrationEnabled({ REGISTRATION_ENABLED: "false" })).toBe(false);
    expect(isRegistrationEnabled({ REGISTRATION_ENABLED: "1" })).toBe(false);
  });

  it("opens only on an explicit true", () => {
    expect(isRegistrationEnabled({ REGISTRATION_ENABLED: "true" })).toBe(true);
    expect(isRegistrationEnabled({ REGISTRATION_ENABLED: " TRUE " })).toBe(true);
  });
});
