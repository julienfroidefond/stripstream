import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SPLASH_SCREENS } from "./splashScreens";

const SPLASH_DIR = join(process.cwd(), "public/images/splash");
const SPLASH_PREFIX = "/images/splash/";

function splashFile(href: string): string {
  expect(href.startsWith(SPLASH_PREFIX), href).toBe(true);
  return href.slice(SPLASH_PREFIX.length);
}

function pngDimensions(file: string): { width: number; height: number } {
  const buffer = readFileSync(join(SPLASH_DIR, file));
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("SPLASH_SCREENS", () => {
  it("declares every generated iOS launch image exactly once", () => {
    const files = readdirSync(SPLASH_DIR)
      .filter((file) => file.endsWith(".png"))
      .sort();
    const declared = SPLASH_SCREENS.map((screen) => splashFile(screen.href)).sort();

    expect(declared).toEqual(files);
    expect(new Set(declared).size).toBe(declared.length);
  });

  it("covers the expected device set", () => {
    expect(SPLASH_SCREENS).toHaveLength(38);
  });

  it("uses a unique media query per device orientation", () => {
    const media = SPLASH_SCREENS.map((screen) => screen.media);
    expect(new Set(media).size).toBe(media.length);
  });

  it.each([
    [
      "/images/splash/splash-2048x2732.png",
      "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    ],
    [
      "/images/splash/splash-2732x2048.png",
      "(device-width: 1366px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)",
    ],
    [
      "/images/splash/splash-828x1792.png",
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    ],
    [
      "/images/splash/splash-1206x2622.png",
      "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    ],
  ])("derives the canonical media query for %s", (href, media) => {
    expect(SPLASH_SCREENS.find((screen) => screen.href === href)?.media).toBe(media);
  });

  it("derives the media query and dimensions from the generated file", () => {
    for (const screen of SPLASH_SCREENS) {
      expect(pngDimensions(splashFile(screen.href))).toEqual({
        width: screen.width,
        height: screen.height,
      });

      const orientation = screen.width > screen.height ? "landscape" : "portrait";
      expect(screen.media).toContain(`(device-width: ${screen.width / screen.pixelRatio}px)`);
      expect(screen.media).toContain(`(device-height: ${screen.height / screen.pixelRatio}px)`);
      expect(screen.media).toContain(`(-webkit-device-pixel-ratio: ${screen.pixelRatio})`);
      expect(screen.media).toContain(`(orientation: ${orientation})`);
    }
  });
});
