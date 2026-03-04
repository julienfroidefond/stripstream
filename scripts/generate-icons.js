const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceLogo = path.join(__dirname, "../public/images/logostripstream.png");
const outputDir = path.join(__dirname, "../public/images/icons");
const screenshotsDir = path.join(__dirname, "../public/images/screenshots");
const splashDir = path.join(__dirname, "../public/images/splash");
const faviconPath = path.join(__dirname, "../public/favicon.png");

// Configuration des splashscreens pour différents appareils
const splashScreens = [
  { width: 2048, height: 2732, name: "iPad Pro 12.9" }, // iPad Pro 12.9
  { width: 1668, height: 2388, name: "iPad Pro 11" }, // iPad Pro 11
  { width: 1536, height: 2048, name: "iPad Mini/Air" }, // iPad Mini, Air
  { width: 1125, height: 2436, name: "iPhone X/XS" }, // iPhone X/XS
  { width: 1242, height: 2688, name: "iPhone XS Max" }, // iPhone XS Max
  { width: 828, height: 1792, name: "iPhone XR" }, // iPhone XR
  { width: 750, height: 1334, name: "iPhone 8/SE" }, // iPhone 8, SE
  { width: 1242, height: 2208, name: "iPhone 8 Plus" }, // iPhone 8 Plus
];

async function generateSplashScreens() {
  await fs.mkdir(splashDir, { recursive: true });

  for (const screen of splashScreens) {
    const outputPath = path.join(splashDir, `splash-${screen.width}x${screen.height}.png`);
    const darkOverlay = Buffer.from(
      `<svg width="${screen.width}" height="${screen.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgba(4, 8, 20, 0.22)" />
      </svg>`
    );

    await sharp(sourceLogo)
      .resize(screen.width, screen.height, {
        fit: "cover",
        position: "center",
      })
      .composite([{ input: darkOverlay, blend: "over" }])
      .png({
        compressionLevel: 9,
      })
      .toFile(outputPath);

    console.log(`✓ Splashscreen ${screen.name} (${screen.width}x${screen.height}) générée`);
  }
}

async function generateIcons() {
  try {
    await fs.access(sourceLogo);

    // Créer les dossiers de sortie s'ils n'existent pas
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(screenshotsDir, { recursive: true });

    // Générer les icônes Android
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

      await sharp(sourceLogo)
        .resize(size, size, {
          fit: "cover",
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fond transparent
        })
        .png({
          compressionLevel: 9,
          palette: true,
        })
        .toFile(outputPath);

      console.log(`✓ Icône Android ${size}x${size} générée`);
    }

    // Générer les icônes Apple (carrées)
    const appleSizes = [152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(outputDir, `apple-icon-${size}x${size}.png`);

      await sharp(sourceLogo)
        .resize(size, size, {
          fit: "cover",
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fond transparent
        })
        .png({
          compressionLevel: 9,
          palette: true,
        })
        .toFile(outputPath);

      console.log(`✓ Icône Apple ${size}x${size} générée`);
    }

    // Générer le favicon principal utilisé par Next metadata
    await sharp(sourceLogo)
      .resize(64, 64, {
        fit: "cover",
      })
      .png({
        compressionLevel: 9,
        palette: true,
      })
      .toFile(faviconPath);

    console.log("✓ Favicon principal généré");

    // Générer les icônes de raccourcis
    const shortcutIcons = ["home", "library"];

    for (const shortcut of shortcutIcons) {
      const outputPath = path.join(outputDir, `${shortcut}.png`);
      await sharp(sourceLogo)
        .resize(96, 96)
        .png({
          compressionLevel: 9,
          palette: true,
        })
        .toFile(outputPath);

      console.log(`✓ Icône de raccourci ${shortcut} générée`);
    }

    // Générer les screenshots de démonstration
    const screenshots = [
      { name: "home", width: 1280, height: 720, color: "#1E293B" },
      { name: "reader", width: 1280, height: 720, color: "#0F172A" },
    ];

    for (const screenshot of screenshots) {
      const outputPath = path.join(screenshotsDir, `${screenshot.name}.png`);

      // Créer une image de démonstration simple
      await sharp({
        create: {
          width: screenshot.width,
          height: screenshot.height,
          channels: 4,
          background: screenshot.color,
        },
      })
        .png()
        .toFile(outputPath);

      console.log(`✓ Screenshot ${screenshot.name} généré`);
    }

    // Générer les splashscreens
    await generateSplashScreens();

    console.log("\n✨ Toutes les icônes ont été générées avec succès !");
  } catch (error) {
    console.error("Erreur lors de la génération des icônes:", error);
    process.exit(1);
  }
}

generateIcons();
