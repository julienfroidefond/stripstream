import { describe, expect, it } from "vitest";

import { interpolateSingleBracePlaceholders } from "./useTranslate";

describe("interpolateSingleBracePlaceholders", () => {
  it("replaces single-brace placeholders, numbers included", () => {
    expect(
      interpolateSingleBracePlaceholders("{count} tomes sur {total}", {
        count: 3,
        total: 0,
      })
    ).toBe("3 tomes sur 0");
  });

  it("leaves unknown placeholders and double braces untouched", () => {
    expect(
      interpolateSingleBracePlaceholders("{{count}} séries, {other}", { count: 2 })
    ).toBe("{{count}} séries, {other}");
    expect(interpolateSingleBracePlaceholders("Page {current} / {total}", {})).toBe(
      "Page {current} / {total}"
    );
  });

  it("treats placeholder keys as literals, not as regex patterns", () => {
    expect(
      interpolateSingleBracePlaceholders("{count.total} / {a+b}", {
        "count.total": 4,
        "a+b": 2,
      })
    ).toBe("4 / 2");
    expect(interpolateSingleBracePlaceholders("{countXtotal}", { "count.total": 4 })).toBe(
      "{countXtotal}"
    );
  });
});
