const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceLogo = path.join(__dirname, "../public/images/logostripstream.png");
const outputDir = path.join(__dirname, "../public/images/icons");
const screenshotsDir = path.join(__dirname, "../public/images/screenshots");
const splashDir = path.join(__dirname, "../public/images/splash");
const faviconPath = path.join(__dirname, "../public/favicon.png");

// Source pour les splash screens
const splashSource = path.join(__dirname, "../public/images/Gemini_Generated_Image_wyfsoiwyfsoiwyfs.png");

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

  // Couleur du thème dark du site : hsl(222, 35%, 10%) = #111826
  const bg = { r: 17, g: 24, b: 38 };

  // Charger le logo source
  const logoMeta = await sharp(sourceLogo).metadata();
  const logoBuffer = await sharp(sourceLogo).png().toBuffer();

  for (const screen of splashScreens) {
    const { width, height } = screen;
    const shortSide = Math.min(width, height);

    // Taille du logo : 40% du côté le plus court
    const logoSize = Math.round(shortSide * 0.4);

    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);

    // Fond uni + touches cyan/magenta + grille subtile + glow derrière le logo
    const glowRadius = Math.round(logoSize * 0.9);
    const dotSpacing = 24;
    const gradientSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="${(glowRadius / Math.max(width, height) * 100).toFixed(1)}%">
          <stop offset="0%" stop-color="rgba(86,184,222,0.15)" />
          <stop offset="100%" stop-color="rgba(86,184,222,0)" />
        </radialGradient>
        <radialGradient id="cyan" cx="35%" cy="30%" r="50%">
          <stop offset="0%" stop-color="rgba(56,189,210,0.08)" />
          <stop offset="100%" stop-color="rgba(56,189,210,0)" />
        </radialGradient>
        <radialGradient id="magenta" cx="65%" cy="70%" r="50%">
          <stop offset="0%" stop-color="rgba(180,60,120,0.08)" />
          <stop offset="100%" stop-color="rgba(180,60,120,0)" />
        </radialGradient>
        <pattern id="grid" width="${dotSpacing}" height="${dotSpacing}" patternUnits="userSpaceOnUse">
          <line x1="0" y1="${dotSpacing}" x2="${dotSpacing}" y2="${dotSpacing}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
          <line x1="${dotSpacing}" y1="0" x2="${dotSpacing}" y2="${dotSpacing}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="rgb(${bg.r},${bg.g},${bg.b})" />
      <rect width="${width}" height="${height}" fill="url(#cyan)" />
      <rect width="${width}" height="${height}" fill="url(#magenta)" />
      <rect width="${width}" height="${height}" fill="url(#grid)" />
      <rect width="${width}" height="${height}" fill="url(#glow)" />
    </svg>`;

    // Redimensionner le logo et le cropper en cercle
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, { fit: "cover" })
      .png()
      .toBuffer();

    // Masque circulaire pour cropper le logo en rond
    const circleMask = Buffer.from(
      `<svg width="${logoSize}" height="${logoSize}"><circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize / 2}" fill="white"/></svg>`
    );

    const circularLogo = await sharp(resizedLogo)
      .composite([{ input: circleMask, blend: "dest-in" }])
      .png()
      .toBuffer();

    const logoLeft = Math.round((width - logoSize) / 2);
    const logoTop = Math.round((height - logoSize) / 2);

    // Composer : fond dégradé + cercle + logo
    await sharp(Buffer.from(gradientSvg))
      .png()
      .composite([
        {
          input: circularLogo,
          left: logoLeft,
          top: logoTop,
        },
      ])
      .png({ compressionLevel: 9 })
      .toFile(path.join(splashDir, `splash-${width}x${height}.png`));

    console.log(`  ✓ ${screen.name} (${width}x${height})`);
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
