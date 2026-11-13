// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ prefetch: vi.fn(), linkProps: [] as unknown[] }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ prefetch: mocks.prefetch }) }));
vi.mock("next/link", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.linkProps.push(props);
    const { prefetch: _prefetch, href, ...rest } = props;
    return createElement("a", { ...rest, href: String(href) });
  },
}));

import { INTENT_PREFETCH_DELAY_MS, IntentLink } from "./IntentLink";

function renderLink(props: Record<string, unknown> = {}) {
  render(createElement(IntentLink, { href: "/series/s1", ...props }, "Série"));
  return screen.getByRole("link", { name: "Série" });
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.prefetch.mockReset();
  mocks.linkProps.length = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("IntentLink", () => {
  it("never lets Next prefetch on viewport entry", () => {
    renderLink();
    expect(mocks.linkProps.at(-1)).toMatchObject({ prefetch: false });
    expect(mocks.prefetch).not.toHaveBeenCalled();
  });

  it("prefetches once after the mouse rests on the link", () => {
    const link = renderLink();

    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(INTENT_PREFETCH_DELAY_MS - 1));
    expect(mocks.prefetch).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(mocks.prefetch).toHaveBeenCalledExactlyOnceWith("/series/s1");

    fireEvent.pointerLeave(link);
    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(INTENT_PREFETCH_DELAY_MS));
    fireEvent.focus(link);
    expect(mocks.prefetch).toHaveBeenCalledTimes(1);
  });

  it("does not prefetch when the pointer only sweeps across the link", () => {
    const link = renderLink();

    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(INTENT_PREFETCH_DELAY_MS / 2));
    fireEvent.pointerLeave(link);
    act(() => vi.advanceTimersByTime(INTENT_PREFETCH_DELAY_MS * 2));

    expect(mocks.prefetch).not.toHaveBeenCalled();
  });

  it("prefetches immediately on keyboard focus or press, and keeps caller handlers", () => {
    const onFocus = vi.fn();
    const link = renderLink({ onFocus });

    fireEvent.focus(link);
    expect(mocks.prefetch).toHaveBeenCalledExactlyOnceWith("/series/s1");
    expect(onFocus).toHaveBeenCalledTimes(1);

    cleanup();
    mocks.prefetch.mockReset();
    fireEvent.pointerDown(renderLink());
    expect(mocks.prefetch).toHaveBeenCalledExactlyOnceWith("/series/s1");
  });
});
