"use client";

import { useEffect, useState } from "react";
import { replaceDocument } from "@/lib/browser/navigation";
import { isStandalonePwa } from "@/lib/browser/standalone";
import {
  clearReaderHiddenAt,
  planReaderResume,
  readReaderHiddenAt,
  readerSessionStorage,
  writeReaderHiddenAt,
} from "@/lib/reader/resume-home";

const HOME_HREF = "/";

/**
 * Sends the user home when an installed PWA comes back after a long absence
 * while the reader is open.
 *
 * iPadOS resumes a suspended PWA from its snapshot, or evicts it and reloads
 * the current reader URL from the server. The reader's transient state is not
 * reliable across that gap (stale history for the close button, images being
 * fetched again), so a long absence lands on home instead. A short app switch
 * keeps the reader open, and a normal browser tab is never redirected.
 *
 * `sessionStorage` carries the hidden timestamp across an iOS eviction; the
 * in-memory copy covers a resume without a reload. Returns `true` once the
 * redirect is under way so the reader route can keep its skeleton mounted
 * instead of flashing the reader for a frame.
 */
export function useReaderResumeHome(): boolean {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isStandalonePwa()) return;

    const storage = readerSessionStorage();
    let hiddenAt: number | null = null;
    let left = false;

    const rememberHidden = () => {
      // The pagehide caused by leaving for home must not write a fresh marker.
      if (left) return;
      const timestamp = Date.now();
      hiddenAt = timestamp;
      writeReaderHiddenAt(storage, timestamp);
    };

    const forgetHidden = () => {
      hiddenAt = null;
      clearReaderHiddenAt(storage);
    };

    const leaveForHome = () => {
      if (left) return;
      left = true;
      // Clear before navigating: a marker left behind would send the next
      // reader opened from home straight back here.
      forgetHidden();
      setLeaving(true);
      replaceDocument(HOME_HREF);
    };

    const settle = () => {
      const timestamp = hiddenAt ?? readReaderHiddenAt(storage);
      if (planReaderResume({ hiddenAt: timestamp, now: Date.now() }) === "home") {
        leaveForHome();
        return;
      }
      forgetHidden();
    };

    // After an iOS eviction the component mounts in a fresh document: the
    // timestamp written by the document it replaced is the only evidence the
    // reader was suspended.
    settle();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") rememberHidden();
      else settle();
    };
    const handlePageHide = () => rememberHidden();
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) settle();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      forgetHidden();
    };
  }, []);

  return leaving;
}
