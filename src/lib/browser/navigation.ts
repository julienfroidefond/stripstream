/**
 * Replace the current document with another URL.
 *
 * A full navigation is deliberate for lifecycle recoveries (an expired
 * session, a PWA resumed in a state the app cannot trust): it throws away the
 * in-memory client state instead of navigating through a router that may be
 * stale.
 */
export function replaceDocument(href: string): void {
  window.location.replace(href);
}
