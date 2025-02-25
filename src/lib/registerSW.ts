export const registerServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
    // console.log("Service Worker registered with scope:", registration.scope);
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
};
