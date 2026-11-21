import { describe, expect, it } from "vitest";

import {
  clearReaderHiddenAt,
  planReaderResume,
  READER_HIDDEN_AT_STORAGE_KEY,
  READER_RESUME_HOME_AFTER_MS,
  readReaderHiddenAt,
  writeReaderHiddenAt,
  type ReaderResumeStorage,
} from "./resume-home";

const now = 1_800_000_000_000;

function memoryStorage(initial: Record<string, string> = {}): ReaderResumeStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("planReaderResume", () => {
  it("stays when the reader never went hidden", () => {
    expect(planReaderResume({ hiddenAt: null, now })).toBe("stay");
  });

  it("stays during a short app switch", () => {
    expect(planReaderResume({ hiddenAt: now - 60_000, now })).toBe("stay");
  });

  it("goes home once the absence reaches the threshold", () => {
    expect(
      planReaderResume({ hiddenAt: now - READER_RESUME_HOME_AFTER_MS, now })
    ).toBe("home");
    expect(
      planReaderResume({ hiddenAt: now - READER_RESUME_HOME_AFTER_MS - 1, now })
    ).toBe("home");
  });

  it("stays for an invalid timestamp", () => {
    expect(planReaderResume({ hiddenAt: Number.NaN, now })).toBe("stay");
  });
});

describe("reader hidden-at storage", () => {
  it("round-trips the timestamp", () => {
    const storage = memoryStorage();

    writeReaderHiddenAt(storage, now);

    expect(readReaderHiddenAt(storage)).toBe(now);
  });

  it("clears the timestamp", () => {
    const storage = memoryStorage({ [READER_HIDDEN_AT_STORAGE_KEY]: String(now) });

    clearReaderHiddenAt(storage);

    expect(readReaderHiddenAt(storage)).toBeNull();
  });

  it("ignores a missing, malformed or non-positive value", () => {
    expect(readReaderHiddenAt(memoryStorage())).toBeNull();
    expect(
      readReaderHiddenAt(memoryStorage({ [READER_HIDDEN_AT_STORAGE_KEY]: "later" }))
    ).toBeNull();
    expect(
      readReaderHiddenAt(memoryStorage({ [READER_HIDDEN_AT_STORAGE_KEY]: "-1" }))
    ).toBeNull();
  });

  it("degrades to null when storage throws", () => {
    const storage: ReaderResumeStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };

    expect(() => writeReaderHiddenAt(storage, now)).not.toThrow();
    expect(() => clearReaderHiddenAt(storage)).not.toThrow();
    expect(readReaderHiddenAt(storage)).toBeNull();
  });

  it("accepts an unavailable storage", () => {
    expect(() => writeReaderHiddenAt(null, now)).not.toThrow();
    expect(() => clearReaderHiddenAt(null)).not.toThrow();
    expect(readReaderHiddenAt(null)).toBeNull();
  });
});
