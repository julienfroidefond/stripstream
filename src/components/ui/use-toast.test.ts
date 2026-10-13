import { afterEach, describe, expect, it, vi } from "vitest";

import { reducer } from "./use-toast";

type ReducerState = Parameters<typeof reducer>[0];
type Toast = ReducerState["toasts"][number];

function makeToast(id: string, overrides: Partial<Toast> = {}): Toast {
  return { id, open: true, ...overrides };
}

describe("toast reducer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("prepends a new toast", () => {
    const state = reducer({ toasts: [] }, { type: "ADD_TOAST", toast: makeToast("a") });
    expect(state.toasts.map((t) => t.id)).toEqual(["a"]);
  });

  it("caps the list at TOAST_LIMIT, dropping the oldest", () => {
    let state: ReducerState = { toasts: [] };
    state = reducer(state, { type: "ADD_TOAST", toast: makeToast("a") });
    state = reducer(state, { type: "ADD_TOAST", toast: makeToast("b") });

    expect(state.toasts.map((t) => t.id)).toEqual(["b"]);
  });

  it("merges an update into the matching toast only", () => {
    const state: ReducerState = { toasts: [makeToast("a"), makeToast("b", { open: false })] };
    const next = reducer(state, { type: "UPDATE_TOAST", toast: { id: "a", title: "New" } });

    expect(next.toasts[0]).toMatchObject({ id: "a", title: "New", open: true });
    expect(next.toasts[1]).toEqual({ id: "b", open: false });
  });

  it("leaves state unchanged when updating an unknown id", () => {
    const state: ReducerState = { toasts: [makeToast("known")] };
    const next = reducer(state, { type: "UPDATE_TOAST", toast: { id: "unknown", title: "x" } });

    expect(next.toasts).toEqual([{ id: "known", open: true }]);
  });

  it("closes only the targeted toast on dismiss", () => {
    vi.useFakeTimers();
    const state: ReducerState = { toasts: [makeToast("dismiss-a"), makeToast("dismiss-b")] };
    const next = reducer(state, { type: "DISMISS_TOAST", toastId: "dismiss-a" });

    expect(next.toasts).toEqual([
      { id: "dismiss-a", open: false },
      { id: "dismiss-b", open: true },
    ]);
  });

  it("closes every toast when dismiss carries no id", () => {
    vi.useFakeTimers();
    const state: ReducerState = { toasts: [makeToast("all-a"), makeToast("all-b")] };
    const next = reducer(state, { type: "DISMISS_TOAST" });

    expect(next.toasts.every((t) => t.open === false)).toBe(true);
  });

  it("removes a single toast by id", () => {
    const state: ReducerState = { toasts: [makeToast("rm-a"), makeToast("rm-b")] };
    const next = reducer(state, { type: "REMOVE_TOAST", toastId: "rm-a" });

    expect(next.toasts.map((t) => t.id)).toEqual(["rm-b"]);
  });

  it("clears every toast when remove carries no id", () => {
    const state: ReducerState = { toasts: [makeToast("clear-a"), makeToast("clear-b")] };

    expect(reducer(state, { type: "REMOVE_TOAST" }).toasts).toEqual([]);
  });
});
