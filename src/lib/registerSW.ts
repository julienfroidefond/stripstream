import logger from "@/lib/logger";

interface ServiceWorkerRegistrationOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

const SW_ENABLED_STORAGE_KEY = "stripstream:sw-enabled";
const LEGACY_DEV_SW_ENABLED_STORAGE_KEY = "stripstream:sw-dev-enabled";

export const isServiceWorkerEnabledInDev = (): boolean => {
  if (typeof window === "undefined") return false;

  const storedValue = window.localStorage.getItem(SW_ENABLED_STORAGE_KEY);
  if (storedValue === "true") return true;
  if (storedValue === "false") return false;

  const legacyValue = window.localStorage.getItem(LEGACY_DEV_SW_ENABLED_STORAGE_KEY);
  if (legacyValue === "true") return true;
  if (legacyValue === "false") return false;

  // Disabled by default in all environments; user preference can override.
  return false;
};

export const setServiceWorkerEnabledInDev = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SW_ENABLED_STORAGE_KEY, enabled ? "true" : "false");
  window.localStorage.removeItem(LEGACY_DEV_SW_ENABLED_STORAGE_KEY);
};

/**
 * Register the service worker with optional callbacks for update and success events
 */
export const registerServiceWorker = async (
  options: ServiceWorkerRegistrationOptions = {}
): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const { onUpdate, onSuccess, onError } = options;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Check for updates immediately
    registration.update().catch(() => {
      // Ignore update check errors
    });

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            logger.info("New service worker available");
            onUpdate?.(registration);
          } else {
            // First install
            logger.info("Service worker installed for the first time");
            onSuccess?.(registration);
          }
        }
      });
    });

    // If already active, call success
    if (registration.active) {
      onSuccess?.(registration);
    }

    return registration;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, "Service Worker registration failed");
    onError?.(err);
    return null;
  }
};

/**
 * Unregister all service workers
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
    logger.info("All service workers unregistered");
    return true;
  } catch (error) {
    logger.error({ err: error }, "Failed to unregister service workers");
    return false;
  }
};

/**
 * Send a message to the active service worker
 */
export const sendMessageToSW = <T = unknown>(message: unknown): Promise<T | null> => {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve(null);
      return;
    }

    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data as T);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);

    // Timeout after 5 seconds
    setTimeout(() => {
      resolve(null);
    }, 5000);
  });
};

/**
 * Check if the app is running as a PWA (standalone mode)
 */
export const isPWA = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
};

/**
 * Get the current service worker registration
 */
export const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
};
