import { describe, expect, it } from "vitest";

import { abortTrackedFetches } from "./abortTrackedFetches";

function trackedController() {
  return new AbortController();
}

describe("abortTrackedFetches", () => {
  it("aborts every tracked controller", () => {
    const first = trackedController();
    const second = trackedController();

    expect(abortTrackedFetches([first, second])).toEqual([]);
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(true);
  });

  it("keeps aborting after a controller throws and reports the failure", () => {
    const boom = new Error("abort exploded");
    const failing = {
      abort: () => {
        throw boom;
      },
      signal: new AbortController().signal,
    } as unknown as AbortController;
    const surviving = trackedController();

    const failures = abortTrackedFetches([failing, surviving]);

    expect(failures).toEqual([boom]);
    expect(surviving.signal.aborted).toBe(true);
  });

  it("accepts a lazy iterator such as Map.values()", () => {
    const controller = trackedController();
    const controllers = new Map([["1", controller]]);

    expect(abortTrackedFetches(controllers.values())).toEqual([]);
    expect(controller.signal.aborted).toBe(true);
  });
});
