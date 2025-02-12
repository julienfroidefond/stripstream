const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, "../public/favicon.svg");
const outputDir = path.join(__dirname, "../public/images/icons");

async function generateIcons() {
  try {
    // Créer le dossier de sortie s'il n'existe pas
    await fs.mkdir(outputDir, { recursive: true });

    // Générer les icônes pour chaque taille
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

      await sharp(inputSvg).resize(size, size).png().toFile(outputPath);

      console.log(`✓ Icône ${size}x${size} générée`);
    }

    console.log("\n✨ Toutes les icônes ont été générées avec succès !");
  } catch (error) {
    console.error("Erreur lors de la génération des icônes:", error);
    process.exit(1);
  }
}

generateIcons();
