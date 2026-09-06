"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <SessionResumeGuard />
      {children}
    </SessionProvider>
  );
}

const publicRoutes = ["/login", "/register"];

/**
 * iPadOS can restore a suspended standalone PWA from its in-memory snapshot.
 * No navigation reaches the middleware in that case, so an expired session
 * would otherwise leave the old authenticated shell visible until the next
 * click. Revalidate as soon as the app becomes visible again.
 */
function SessionResumeGuard() {
  const pathname = usePathname();
  const checkInProgress = useRef(false);

  useEffect(() => {
    if (publicRoutes.includes(pathname)) return;

    const validateSession = async () => {
      if (document.visibilityState !== "visible" || checkInProgress.current) return;

      checkInProgress.current = true;
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;

        const session = (await response.json()) as { user?: unknown } | null;
        if (!session?.user) {
          const from = `${window.location.pathname}${window.location.search}`;
          window.location.replace(`/login?from=${encodeURIComponent(from)}`);
        }
      } catch {
        // A resume while offline must keep the downloaded/offline experience
        // available. Authentication will be checked again on the next resume.
      } finally {
        checkInProgress.current = false;
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void validateSession();
    };

    document.addEventListener("visibilitychange", validateSession);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", validateSession);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname]);

  return null;
}
