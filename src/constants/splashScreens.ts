import splashScreenSources from "./splashScreens.json";

interface SplashScreenSource {
  name: string;
  width: number;
  height: number;
  pixelRatio: number;
}

export interface SplashScreen extends SplashScreenSource {
  href: string;
  media: string;
}

/**
 * iOS ignores the web manifest for the launch screen: it only uses
 * `apple-touch-startup-image` links whose media query matches the device.
 * The list is shared with `scripts/generate-icons.js` so every generated
 * image stays declared in the root layout.
 */
export const SPLASH_SCREENS: SplashScreen[] = (splashScreenSources as SplashScreenSource[]).map(
  (screen) => {
    const deviceWidth = screen.width / screen.pixelRatio;
    const deviceHeight = screen.height / screen.pixelRatio;
    const orientation = screen.width > screen.height ? "landscape" : "portrait";

    return {
      ...screen,
      href: `/images/splash/splash-${screen.width}x${screen.height}.png`,
      media:
        `(device-width: ${deviceWidth}px) and (device-height: ${deviceHeight}px) and ` +
        `(-webkit-device-pixel-ratio: ${screen.pixelRatio}) and (orientation: ${orientation})`,
    };
  }
);
