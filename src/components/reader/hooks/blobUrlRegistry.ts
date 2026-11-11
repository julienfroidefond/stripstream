export type ImageKey = number | string; // Pages numériques et clés préfixées comme "next-1"

/**
 * Source de vérité synchrone des blob URLs vivantes du reader.
 *
 * L'état React ne sert qu'au rendu : il peut retarder d'un commit, ce qui
 * laissait un blob décodé juste avant l'unmount échapper au cleanup. Toutes
 * les créations/remplacements/suppressions passent ici, et chaque URL est
 * révoquée au plus une fois.
 */
export class BlobUrlRegistry {
  private readonly urls = new Map<ImageKey, string>();

  set(key: ImageKey, url: string): void {
    const previous = this.urls.get(key);
    if (previous === url) return;
    if (previous) URL.revokeObjectURL(previous);
    this.urls.set(key, url);
  }

  get(key: ImageKey): string | undefined {
    return this.urls.get(key);
  }

  has(key: ImageKey): boolean {
    return this.urls.has(key);
  }

  keys(): ImageKey[] {
    return Array.from(this.urls.keys());
  }

  delete(key: ImageKey): void {
    const url = this.urls.get(key);
    if (!url) return;
    URL.revokeObjectURL(url);
    this.urls.delete(key);
  }

  clear(): void {
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  get size(): number {
    return this.urls.size;
  }
}
