import logger from "@/lib/logger";

export const registerServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
    // logger.info("Service Worker registered with scope:", registration.scope);
  } catch (error) {
    logger.error({ err: error }, "Service Worker registration failed:");
  }
};
