/**
 * Helpers de téléchargement du fichier source d'un tome, côté navigateur.
 *
 * Les web apps iOS installées sur l'écran d'accueil ne peuvent pas télécharger
 * un fichier en naviguant dessus : la web view reste bloquée sur un document
 * vide sans retour possible (bug WebKit). Le contournement consiste à récupérer
 * le fichier puis à le confier à la feuille de partage native.
 */

export function isIosStandalone(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Extrait le nom de fichier d'un en-tête `Content-Disposition` (RFC 6266 / 5987). */
export function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return null;
    }
  }

  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
}

/** Récupère le fichier sous forme de `File` pour l'API Web Share (`navigator.share`). */
export async function fetchSharedFile(url: string, fallbackName = "book"): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed (${response.status})`);
  }

  const blob = await response.blob();
  const filename =
    filenameFromContentDisposition(response.headers.get("content-disposition")) ?? fallbackName;
  return new File([blob], filename, { type: blob.type || "application/octet-stream" });
}

/** Indique si le navigateur peut remettre un fichier à la feuille de partage native. */
export function canShareFiles(file: File): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.canShare !== "function") return false;
  return navigator.canShare({ files: [file] });
}
