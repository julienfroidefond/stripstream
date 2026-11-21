/**
 * Whether the app runs as the installed PWA rather than in a browser tab.
 *
 * iOS exposes `navigator.standalone`; every other platform (and modern iOS)
 * reports the installed display mode through a media query. Some behaviours
 * target the installed app specifically — a browser tab that comes back must
 * keep its current page.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;

  const displayMode =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)").matches
      : false;
  const navigatorStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return displayMode || navigatorStandalone;
}
