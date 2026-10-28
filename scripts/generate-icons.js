const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
// Un seul logo pour les icônes d'app et les splash screens : la marque sombre
// détourée, posée sur le fond du thème sombre (et non sur le fond cuit dans
// l'ancien visuel, qui ne coïncidait pas avec lui) ; la monochrome reste dédiée
// au favicon, seule lisible en tout petit.
const sourceLogo = path.join(__dirname, "../public/images/logo-mark-dark.png");
const splashLogo = sourceLogo;
const faviconLogo = path.join(__dirname, "../public/images/logostripstream-mono.png");

// `--background` du thème sombre (hsl(220 13% 9%)), la couleur de la salle :
// icônes et splash screens s'y fondent, sans carré visible autour de la marque.
const themeBackground = { r: 20, g: 22, b: 26 };
const outputDir = path.join(__dirname, "../public/images/icons");
const screenshotsDir = path.join(__dirname, "../public/images/screenshots");
const splashDir = path.join(__dirname, "../public/images/splash");
const faviconPath = path.join(__dirname, "../public/favicon.png");

// Configuration des splashscreens, partagée avec les liens iOS du root layout.
const splashScreens = require("../src/constants/splashScreens.json");

async function generateSplashScreens() {
  await fs.mkdir(splashDir, { recursive: true });
  console.log(`\n📱 Génération des splash screens...`);

  // Le fond du thème sombre, pour que le logo se fonde dans l'écran sans cadre.
  const bg = themeBackground;

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
        .resize(size, size, { fit: "cover" })
        .flatten({ background: themeBackground }) // iOS refuse la transparence
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
        .resize(size, size, { fit: "cover" })
        .flatten({ background: themeBackground }) // iOS refuse la transparence
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
        .flatten({ background: themeBackground })
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
