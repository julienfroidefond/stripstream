const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, "../public/favicon.svg");
const inputAppleSvg = path.join(__dirname, "../public/apple-icon.svg");
const outputDir = path.join(__dirname, "../public/images/icons");
const screenshotsDir = path.join(__dirname, "../public/images/screenshots");
const splashDir = path.join(__dirname, "../public/images/splash");

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

  // Créer le SVG de base pour la splashscreen avec le même style que le favicon
  const splashSvg = `
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#4F46E5"/>
      <g transform="translate(25, 20) scale(1.5)">
        <!-- Lettre S stylisée -->
        <path 
          d="M21 12C21 10.3431 19.6569 9 18 9H14C12.3431 9 11 10.3431 11 12V12.5C11 14.1569 12.3431 15.5 14 15.5H18C19.6569 15.5 21 16.8431 21 18.5V19C21 20.6569 19.6569 22 18 22H14C12.3431 22 11 20.6569 11 19" 
          stroke="white" 
          stroke-width="3" 
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Points décoratifs -->
        <circle cx="11" cy="24" r="1.5" fill="white"/>
        <circle cx="21" cy="8" r="1.5" fill="white"/>
      </g>
    </svg>
  `;

  for (const screen of splashScreens) {
    const outputPath = path.join(splashDir, `splash-${screen.width}x${screen.height}.png`);

    await sharp(Buffer.from(splashSvg))
      .resize(screen.width, screen.height, {
        fit: "contain",
        background: "#4F46E5",
      })
      .png()
      .toFile(outputPath);

    console.log(`✓ Splashscreen ${screen.name} (${screen.width}x${screen.height}) générée`);
  }
}

async function generateIcons() {
  try {
    // Créer les dossiers de sortie s'ils n'existent pas
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(screenshotsDir, { recursive: true });

    // Générer les icônes Android (avec bords arrondis)
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

      await sharp(inputSvg)
        .resize(size, size, {
          fit: "contain",
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

      await sharp(inputAppleSvg)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fond transparent
        })
        .png({
          compressionLevel: 9,
          palette: true,
        })
        .toFile(outputPath);

      console.log(`✓ Icône Apple ${size}x${size} générée`);
    }

    // Générer les icônes de raccourcis
    const shortcutIcons = [
      { name: "home", icon: "Home" },
      { name: "library", icon: "Library" },
    ];

    for (const shortcut of shortcutIcons) {
      const outputPath = path.join(outputDir, `${shortcut.name}.png`);

      // Créer une image carrée avec fond indigo et icône blanche
      const svg = `
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="96" height="96" rx="20" fill="#4F46E5"/>
          <path d="${getIconPath(
            shortcut.icon
          )}" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .resize(96, 96)
        .png({
          compressionLevel: 9,
          palette: true,
        })
        .toFile(outputPath);

      console.log(`✓ Icône de raccourci ${shortcut.name} générée`);
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

// Fonction helper pour obtenir les chemins SVG des icônes
function getIconPath(iconName) {
  const paths = {
    Home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    Library:
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20",
  };
  return paths[iconName] || "";
}

generateIcons();
