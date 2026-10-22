// @vitest-environment jsdom
import { createElement, type ComponentProps, type ReactElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UserScopeProvider } from "@/contexts/UserScopeContext";
import { useCarouselViewMode } from "./useCarouselViewMode";

const SUFFIX = "test-carousel-view-mode";
const SCOPED_KEY = `stripstream:user-a:${SUFFIX}`;

function Probe() {
  const { viewMode, toggleViewMode } = useCarouselViewMode(SUFFIX);
  return createElement("button", { type: "button", onClick: toggleViewMode }, viewMode);
}

function SpotlightProbe() {
  const { viewMode } = useCarouselViewMode(SUFFIX, { defaultMode: "spotlight" });
  return createElement("button", { type: "button" }, viewMode);
}

function renderProbe(scope = "user-a", probe: () => ReactElement = Probe) {
  return render(
    createElement(
      UserScopeProvider,
      { scope } as ComponentProps<typeof UserScopeProvider>,
      createElement(probe)
    )
  );
}

function renderedMode() {
  return screen.getByRole("button").textContent;
}

describe("useCarouselViewMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it("starts in classic mode when nothing is stored", () => {
    renderProbe();
    expect(renderedMode()).toBe("classic");
  });

  it("uses the row default mode when nothing is stored", () => {
    renderProbe("user-a", SpotlightProbe);
    expect(renderedMode()).toBe("spotlight");
  });

  it("applies the stored preference after mount", async () => {
    window.localStorage.setItem(SCOPED_KEY, "spotlight");

    renderProbe();

    await waitFor(() => expect(renderedMode()).toBe("spotlight"));
  });

  it("persists the toggle under the user-scoped key", () => {
    renderProbe();

    fireEvent.click(screen.getByRole("button"));

    expect(renderedMode()).toBe("spotlight");
    expect(window.localStorage.getItem(SCOPED_KEY)).toBe("spotlight");
  });

  it("ignores an unknown stored value and falls back to classic", async () => {
    window.localStorage.setItem(SCOPED_KEY, "hero");

    renderProbe();

    await waitFor(() => expect(renderedMode()).toBe("classic"));
  });
});
