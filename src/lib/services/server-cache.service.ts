import fs from "fs";
import path from "path";
import { PreferencesService } from "./preferences.service";
import { DebugService } from "./debug.service";
import { getCurrentUser } from "../auth-utils";

export type CacheMode = "file" | "memory";

interface CacheConfig {
  mode: CacheMode;
}

class ServerCacheService {
  private static instance: ServerCacheService;
  private cacheDir: string;
  private memoryCache: Map<string, { data: unknown; expiry: number }> = new Map();
  private config: CacheConfig = {
    mode: "memory",
  };

  // Configuration des temps de cache en millisecondes
  private static readonly fiveMinutes = 5 * 60 * 1000;
  private static readonly tenMinutes = 10 * 60 * 1000;
  private static readonly twentyFourHours = 24 * 60 * 60 * 1000;
  private static readonly oneMinute = 1 * 60 * 1000;
  private static readonly oneWeek = 7 * 24 * 60 * 60 * 1000;
  private static readonly noCache = 0;

  // Configuration des temps de cache
  private static readonly DEFAULT_TTL = {
    DEFAULT: ServerCacheService.fiveMinutes,
    HOME: ServerCacheService.tenMinutes,
    LIBRARIES: ServerCacheService.twentyFourHours,
    SERIES: ServerCacheService.fiveMinutes,
    BOOKS: ServerCacheService.fiveMinutes,
    IMAGES: ServerCacheService.oneWeek,
  };

  private constructor() {
    this.cacheDir = path.join(process.cwd(), ".cache");
    this.ensureCacheDirectory();
    this.cleanExpiredCache();
    this.initializeCacheMode();
  }

  private async initializeCacheMode(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        this.setCacheMode("memory");
        return;
      }
      const preferences = await PreferencesService.getPreferences();
      this.setCacheMode(preferences.cacheMode);
    } catch (error) {
      console.error("Error initializing cache mode from preferences:", error);
      // Keep default memory mode if preferences can't be loaded
    }
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(key: string): string {
    // Nettoyer la clé des caractères spéciaux et des doubles slashes
    const sanitizedKey = key.replace(/[<>:"|?*]/g, "_").replace(/\/+/g, "/");

    const filePath = path.join(this.cacheDir, `${sanitizedKey}.json`);

    return filePath;
  }

  private cleanExpiredCache(): void {
    if (!fs.existsSync(this.cacheDir)) return;

    const cleanDirectory = (dirPath: string): boolean => {
      if (!fs.existsSync(dirPath)) return true;

      const items = fs.readdirSync(dirPath);
      let isEmpty = true;

      for (const item of items) {
        const itemPath = path.join(dirPath, item);

        try {
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            const isSubDirEmpty = cleanDirectory(itemPath);
            if (isSubDirEmpty) {
              try {
                fs.rmdirSync(itemPath);
              } catch (error) {
                console.error(`Could not remove directory ${itemPath}:`, error);
                isEmpty = false;
              }
            } else {
              isEmpty = false;
            }
          } else if (stats.isFile() && item.endsWith(".json")) {
            try {
              const content = fs.readFileSync(itemPath, "utf-8");
              const cached = JSON.parse(content);
              if (cached.expiry < Date.now()) {
                fs.unlinkSync(itemPath);
              } else {
                isEmpty = false;
              }
            } catch (error) {
              console.error(`Could not parse file ${itemPath}:`, error);
              // Si le fichier est corrompu, on le supprime
              try {
                fs.unlinkSync(itemPath);
              } catch (error) {
                console.error(`Could not remove file ${itemPath}:`, error);
                isEmpty = false;
              }
            }
          } else {
            isEmpty = false;
          }
        } catch (error) {
          console.error(`Could not access ${itemPath}:`, error);
          // En cas d'erreur sur le fichier/dossier, on continue
          isEmpty = false;
          continue;
        }
      }

      return isEmpty;
    };

    cleanDirectory(this.cacheDir);
  }

  public static async getInstance(): Promise<ServerCacheService> {
    if (!ServerCacheService.instance) {
      ServerCacheService.instance = new ServerCacheService();
      await ServerCacheService.instance.initializeCacheMode();
    }
    return ServerCacheService.instance;
  }

  /**
   * Retourne le TTL pour un type de données spécifique
   */
  public getTTL(type: keyof typeof ServerCacheService.DEFAULT_TTL): number {
    // Utiliser directement la valeur par défaut
    return ServerCacheService.DEFAULT_TTL[type];
  }

  public setCacheMode(mode: CacheMode): void {
    if (this.config.mode === mode) return;

    // Si on passe de mémoire à fichier, on sauvegarde le cache en mémoire
    if (mode === "file" && this.config.mode === "memory") {
      this.memoryCache.forEach((value, key) => {
        if (value.expiry > Date.now()) {
          this.saveToFile(key, value);
        }
      });
      this.memoryCache.clear();
    }
    // Si on passe de fichier à mémoire, on charge le cache fichier en mémoire
    else if (mode === "memory" && this.config.mode === "file") {
      this.loadFileCacheToMemory();
    }

    this.config.mode = mode;
  }

  public getCacheMode(): CacheMode {
    return this.config.mode;
  }

  private loadFileCacheToMemory(): void {
    if (!fs.existsSync(this.cacheDir)) return;

    const loadDirectory = (dirPath: string) => {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        try {
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            loadDirectory(itemPath);
          } else if (stats.isFile() && item.endsWith(".json")) {
            try {
              const content = fs.readFileSync(itemPath, "utf-8");
              const cached = JSON.parse(content);
              if (cached.expiry > Date.now()) {
                const key = path.relative(this.cacheDir, itemPath).slice(0, -5); // Remove .json
                this.memoryCache.set(key, cached);
              }
            } catch (error) {
              console.error(`Could not parse file ${itemPath}:`, error);
              // Ignore les fichiers corrompus
            }
          }
        } catch (error) {
          console.error(`Could not access ${itemPath}:`, error);
          // Ignore les erreurs d'accès
        }
      }
    };

    loadDirectory(this.cacheDir);
  }

  private saveToFile(key: string, value: { data: unknown; expiry: number }): void {
    const filePath = this.getCacheFilePath(key);
    const dirPath = path.dirname(filePath);

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(value), "utf-8");
    } catch (error) {
      console.error(`Could not write cache file ${filePath}:`, error);
    }
  }

  /**
   * Met en cache des données avec une durée de vie
   */
  set(key: string, data: any, type: keyof typeof ServerCacheService.DEFAULT_TTL = "DEFAULT"): void {
    const cacheData = {
      data,
      expiry: Date.now() + this.getTTL(type),
    };

    if (this.config.mode === "memory") {
      this.memoryCache.set(key, cacheData);
    } else {
      const filePath = this.getCacheFilePath(key);
      const dirPath = path.dirname(filePath);

      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(cacheData), "utf-8");
      } catch (error) {
        console.error(`Error writing cache file ${filePath}:`, error);
      }
    }
  }

  /**
   * Récupère des données du cache si elles sont valides
   */
  get(key: string): any | null {
    if (this.config.mode === "memory") {
      const cached = this.memoryCache.get(key);
      if (!cached) return null;

      if (cached.expiry > Date.now()) {
        return cached.data;
      }

      this.memoryCache.delete(key);
      return null;
    }

    const filePath = this.getCacheFilePath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const cached = JSON.parse(content);

      if (cached.expiry > Date.now()) {
        return cached.data;
      }

      fs.unlinkSync(filePath);
      return null;
    } catch (error) {
      console.error(`Error reading cache file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Supprime une entrée du cache
   */
  async delete(key: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }
    const cacheKey = `${user.id}-${key}`;

    if (this.config.mode === "memory") {
      this.memoryCache.delete(cacheKey);
    } else {
      const filePath = this.getCacheFilePath(cacheKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Supprime toutes les entrées du cache qui commencent par un préfixe
   */
  async deleteAll(prefix: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }
    const prefixKey = `${user.id}-${prefix}`;

    if (this.config.mode === "memory") {
      this.memoryCache.forEach((value, key) => {
        if (key.startsWith(prefixKey)) {
          this.memoryCache.delete(key);
        }
      });
    } else {
      const cacheDir = path.join(this.cacheDir, prefixKey);
      if (fs.existsSync(cacheDir)) {
        fs.rmdirSync(cacheDir, { recursive: true });
      }
    }
  }

  /**
   * Vide le cache
   */
  clear(): void {
    if (this.config.mode === "memory") {
      this.memoryCache.clear();
      return;
    }

    if (!fs.existsSync(this.cacheDir)) return;

    const removeDirectory = (dirPath: string) => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        try {
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            removeDirectory(itemPath);
            try {
              fs.rmdirSync(itemPath);
            } catch (error) {
              console.error(`Could not remove directory ${itemPath}:`, error);
            }
          } else {
            try {
              fs.unlinkSync(itemPath);
            } catch (error) {
              console.error(`Could not remove file ${itemPath}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error accessing ${itemPath}:`, error);
        }
      }
    };

    try {
      removeDirectory(this.cacheDir);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Récupère des données du cache ou exécute la fonction si nécessaire
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    type: keyof typeof ServerCacheService.DEFAULT_TTL = "DEFAULT"
  ): Promise<T> {
    const startTime = performance.now();
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const cacheKey = `${user.id}-${key}`;
    const cached = this.get(cacheKey);
    if (cached !== null) {
      const endTime = performance.now();

      // Log la requête avec l'indication du cache (URL plus claire)
      await DebugService.logRequest({
        url: `[CACHE] ${key}`,
        startTime,
        endTime,
        fromCache: true,
        cacheType: type,
      });
      return cached as T;
    }

    try {
      const data = await fetcher();

      this.set(cacheKey, data, type);
      return data;
    } catch (error) {
      throw error;
    }
  }

  invalidate(key: string): void {
    this.delete(key);
  }

  /**
   * Calcule la taille approximative d'un objet en mémoire
   */
  private calculateObjectSize(obj: unknown): number {
    if (obj === null || obj === undefined) return 0;

    // Si c'est un Buffer, utiliser sa taille réelle
    if (Buffer.isBuffer(obj)) {
      return obj.length;
    }

    // Si c'est un objet avec une propriété buffer (comme ImageResponse)
    if (typeof obj === "object" && obj !== null) {
      const objAny = obj as any;
      if (objAny.buffer && Buffer.isBuffer(objAny.buffer)) {
        // Taille du buffer + taille approximative des autres propriétés
        let size = objAny.buffer.length;
        // Ajouter la taille du contentType si présent
        if (objAny.contentType && typeof objAny.contentType === "string") {
          size += objAny.contentType.length * 2; // UTF-16
        }
        return size;
      }
    }

    // Pour les autres types, utiliser JSON.stringify comme approximation
    try {
      return JSON.stringify(obj).length * 2; // x2 pour UTF-16
    } catch {
      // Si l'objet n'est pas sérialisable, retourner une estimation
      return 1000; // 1KB par défaut
    }
  }

  /**
   * Calcule la taille du cache
   */
  async getCacheSize(): Promise<{ sizeInBytes: number; itemCount: number }> {
    if (this.config.mode === "memory") {
      // Calculer la taille approximative en mémoire
      let sizeInBytes = 0;
      let itemCount = 0;

      this.memoryCache.forEach((value) => {
        if (value.expiry > Date.now()) {
          itemCount++;
          // Calculer la taille du data + expiry (8 bytes pour le timestamp)
          sizeInBytes += this.calculateObjectSize(value.data) + 8;
        }
      });

      return { sizeInBytes, itemCount };
    }

    // Calculer la taille du cache sur disque
    let sizeInBytes = 0;
    let itemCount = 0;

    const calculateDirectorySize = (dirPath: string): void => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        try {
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            calculateDirectorySize(itemPath);
          } else if (stats.isFile() && item.endsWith(".json")) {
            sizeInBytes += stats.size;
            itemCount++;
          }
        } catch (error) {
          console.error(`Could not access ${itemPath}:`, error);
        }
      }
    };

    if (fs.existsSync(this.cacheDir)) {
      calculateDirectorySize(this.cacheDir);
    }

    return { sizeInBytes, itemCount };
  }
}

// Créer une instance initialisée du service
let initializedInstance: Promise<ServerCacheService>;

export const getServerCacheService = async (): Promise<ServerCacheService> => {
  if (!initializedInstance) {
    initializedInstance = ServerCacheService.getInstance();
  }
  return initializedInstance;
};

// Exporter aussi la classe pour les tests
export { ServerCacheService };
