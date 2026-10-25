const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
// Un seul logo pour les icônes d'app et les splash screens : la version sombre
// (fond noir), qui s'accorde avec le thème sombre du reader et la plupart des
// écrans d'accueil ; la monochrome reste dédiée au favicon, seule lisible en
// tout petit.
const sourceLogo = path.join(__dirname, "../public/images/logostripstream.png");
const splashLogo = sourceLogo;
const faviconLogo = path.join(__dirname, "../public/images/logostripstream-mono.png");
const outputDir = path.join(__dirname, "../public/images/icons");
const screenshotsDir = path.join(__dirname, "../public/images/screenshots");
const splashDir = path.join(__dirname, "../public/images/splash");
const faviconPath = path.join(__dirname, "../public/favicon.png");

// Configuration des splashscreens pour différents appareils
const splashScreens = [
  // iPad (portrait + landscape)
  { width: 2048, height: 2732, name: "iPad Pro 12.9 portrait" },
  { width: 2732, height: 2048, name: "iPad Pro 12.9 landscape" },
  { width: 1668, height: 2388, name: "iPad Pro 11 portrait" },
  { width: 2388, height: 1668, name: "iPad Pro 11 landscape" },
  { width: 1668, height: 2420, name: "iPad Pro 11 M4 portrait" },
  { width: 2420, height: 1668, name: "iPad Pro 11 M4 landscape" },
  { width: 2064, height: 2752, name: "iPad Pro 13 M4 portrait" },
  { width: 2752, height: 2064, name: "iPad Pro 13 M4 landscape" },
  { width: 1536, height: 2048, name: "iPad Mini/Air portrait" },
  { width: 2048, height: 1536, name: "iPad Mini/Air landscape" },
  { width: 1488, height: 2266, name: "iPad Mini 6 portrait" },
  { width: 2266, height: 1488, name: "iPad Mini 6 landscape" },
  { width: 1620, height: 2160, name: "iPad 10.2 portrait" },
  { width: 2160, height: 1620, name: "iPad 10.2 landscape" },
  { width: 1640, height: 2360, name: "iPad Air 10.9 portrait" },
  { width: 2360, height: 1640, name: "iPad Air 10.9 landscape" },

  // iPhone legacy
  { width: 1125, height: 2436, name: "iPhone X/XS/11 Pro portrait" },
  { width: 2436, height: 1125, name: "iPhone X/XS/11 Pro landscape" },
  { width: 1242, height: 2688, name: "iPhone XS Max/11 Pro Max portrait" },
  { width: 2688, height: 1242, name: "iPhone XS Max/11 Pro Max landscape" },
  { width: 828, height: 1792, name: "iPhone XR/11 portrait" },
  { width: 1792, height: 828, name: "iPhone XR/11 landscape" },
  { width: 750, height: 1334, name: "iPhone 8/SE portrait" },
  { width: 1334, height: 750, name: "iPhone 8/SE landscape" },
  { width: 1242, height: 2208, name: "iPhone 8 Plus portrait" },
  { width: 2208, height: 1242, name: "iPhone 8 Plus landscape" },

  // iPhone modern (12+)
  { width: 1170, height: 2532, name: "iPhone 12/13/14 portrait" },
  { width: 2532, height: 1170, name: "iPhone 12/13/14 landscape" },
  { width: 1284, height: 2778, name: "iPhone 12/13/14 Pro Max portrait" },
  { width: 2778, height: 1284, name: "iPhone 12/13/14 Pro Max landscape" },
  { width: 1179, height: 2556, name: "iPhone 14 Pro/15 portrait" },
  { width: 2556, height: 1179, name: "iPhone 14 Pro/15 landscape" },
  { width: 1290, height: 2796, name: "iPhone 14/15 Pro Max portrait" },
  { width: 2796, height: 1290, name: "iPhone 14/15 Pro Max landscape" },
  { width: 1206, height: 2622, name: "iPhone 16 Pro portrait" },
  { width: 2622, height: 1206, name: "iPhone 16 Pro landscape" },
  { width: 1320, height: 2868, name: "iPhone 16 Pro Max portrait" },
  { width: 2868, height: 1320, name: "iPhone 16 Pro Max landscape" },
  { width: 1170, height: 2532, name: "iPhone 16/16e portrait" },
  { width: 2532, height: 1170, name: "iPhone 16/16e landscape" },
];

async function generateSplashScreens() {
  await fs.mkdir(splashDir, { recursive: true });
  console.log(`\n📱 Génération des splash screens...`);

  // Fond du logo sombre, pour que le logo se fonde dans l'écran sans cadre.
  const bg = { r: 15, g: 12, b: 12 };

  for (const screen of splashScreens) {
    const { width, height } = screen;
    const shortSide = Math.min(width, height);

    // Taille du logo : 40% du côté le plus court
    const logoSize = Math.round(shortSide * 0.4);

    const logo = await sharp(splashLogo).resize(logoSize, logoSize).png().toBuffer();

    await sharp({ create: { width, height, channels: 3, background: bg } })
      .composite([
        {
          input: logo,
          left: Math.round((width - logoSize) / 2),
          top: Math.round((height - logoSize) / 2),
        },
      ])
      .png({ compressionLevel: 9 })
      .toFile(path.join(splashDir, `splash-${width}x${height}.png`));

    console.log(`  ✓ ${screen.name} (${width}x${height})`);
  }
}

async function generateIcons() {
  try {
    await Promise.all([sourceLogo, splashLogo, faviconLogo].map((logo) => fs.access(logo)));

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
    await sharp(faviconLogo)
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
