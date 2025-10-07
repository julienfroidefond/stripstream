import fs from "fs/promises";
import path from "path";
import type { CacheType } from "./base-api.service";
import { AuthServerService } from "./auth-server.service";
import { PreferencesService } from "./preferences.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

export interface RequestTiming {
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  timestamp: string;
  fromCache: boolean;
  cacheType?: CacheType;
  mongoAccess?: {
    operation: string;
    duration: number;
  };
  pageRender?: {
    page: string;
    duration: number;
  };
}

export class DebugService {
  private static writeQueues = new Map<string, Promise<void>>();

  private static async getCurrentUserId(): Promise<string> {
    const user = await AuthServerService.getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user.id;
  }

  private static getLogFilePath(userId: string): string {
    return path.join(process.cwd(), "debug-logs", `${userId}.json`);
  }

  private static async ensureDebugDir(): Promise<void> {
    const debugDir = path.join(process.cwd(), "debug-logs");
    try {
      await fs.access(debugDir);
    } catch {
      await fs.mkdir(debugDir, { recursive: true });
    }
  }

  private static async isDebugEnabled(): Promise<boolean> {
    const user = await AuthServerService.getCurrentUser();
    if (!user) {
      return false;
    }
    const preferences = await PreferencesService.getPreferences();
    return preferences.debug === true;
  }

  private static async readLogs(filePath: string): Promise<RequestTiming[]> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      // Essayer de lire un fichier de sauvegarde
      try {
        const backupPath = filePath + '.backup';
        const backupContent = await fs.readFile(backupPath, "utf-8");
        return JSON.parse(backupContent);
      } catch {
        return [];
      }
    }
  }

  private static async writeLogs(filePath: string, logs: RequestTiming[]): Promise<void> {
    // Obtenir la queue existante ou créer une nouvelle
    const existingQueue = this.writeQueues.get(filePath);
    
    // Créer une nouvelle promesse qui attend la queue précédente
    const newQueue = existingQueue 
      ? existingQueue.then(() => this.performAppend(filePath, logs))
      : this.performAppend(filePath, logs);
    
    // Mettre à jour la queue
    this.writeQueues.set(filePath, newQueue);
    
    try {
      await newQueue;
    } finally {
      // Nettoyer la queue si c'est la dernière opération
      if (this.writeQueues.get(filePath) === newQueue) {
        this.writeQueues.delete(filePath);
      }
    }
  }

  private static async performAppend(filePath: string, logs: RequestTiming[]): Promise<void> {
    try {
      // Lire le fichier existant
      const existingLogs = await this.readLogs(filePath);
      
      // Fusionner avec les nouveaux logs
      const allLogs = [...existingLogs, ...logs];
      
      // Garder seulement les 1000 derniers logs
      const trimmedLogs = allLogs.slice(-1000);
      
      // Créer une sauvegarde avant d'écrire
      try {
        await fs.copyFile(filePath, filePath + '.backup');
      } catch {
        // Ignorer si le fichier n'existe pas encore
      }
      
      // Écrire le fichier complet (c'est nécessaire pour maintenir l'ordre chronologique)
      await fs.writeFile(filePath, JSON.stringify(trimmedLogs, null, 2), { flag: 'w' });
    } catch (error) {
      console.error(`Erreur lors de l'écriture des logs pour ${filePath}:`, error);
      // Ne pas relancer l'erreur pour éviter de casser l'application
    }
  }

  private static async appendLog(filePath: string, log: RequestTiming): Promise<void> {
    // Obtenir la queue existante ou créer une nouvelle
    const existingQueue = this.writeQueues.get(filePath);
    
    // Créer une nouvelle promesse qui attend la queue précédente
    const newQueue = existingQueue 
      ? existingQueue.then(() => this.performSingleAppend(filePath, log))
      : this.performSingleAppend(filePath, log);
    
    // Mettre à jour la queue
    this.writeQueues.set(filePath, newQueue);
    
    try {
      await newQueue;
    } finally {
      // Nettoyer la queue si c'est la dernière opération
      if (this.writeQueues.get(filePath) === newQueue) {
        this.writeQueues.delete(filePath);
      }
    }
  }

  private static async performSingleAppend(filePath: string, log: RequestTiming): Promise<void> {
    try {
      // Lire le fichier existant
      const existingLogs = await this.readLogs(filePath);
      
      // Vérifier les doublons avec des tolérances différentes selon le type
      const isPageRender = log.pageRender !== undefined;
      const timeTolerance = isPageRender ? 500 : 50; // 500ms pour les rendus, 50ms pour les requêtes
      
      const exists = existingLogs.some(existingLog => 
        existingLog.url === log.url && 
        Math.abs(existingLog.duration - log.duration) < 10 && // Durée similaire (10ms de tolérance)
        Math.abs(new Date(existingLog.timestamp).getTime() - new Date(log.timestamp).getTime()) < timeTolerance
      );
      
      if (!exists) {
        // Ajouter le nouveau log
        const allLogs = [...existingLogs, log];
        
        // Garder seulement les 1000 derniers logs
        const trimmedLogs = allLogs.slice(-1000);
        
        // Écrire le fichier complet avec gestion d'erreur
        await fs.writeFile(filePath, JSON.stringify(trimmedLogs, null, 2), { flag: 'w' });
      }
    } catch (error) {
      console.error(`Erreur lors de l'écriture du log pour ${filePath}:`, error);
      // Ne pas relancer l'erreur pour éviter de casser l'application
    }
  }

  private static createTiming(
    url: string,
    startTime: number,
    endTime: number,
    fromCache: boolean,
    additionalData?: Partial<RequestTiming>
  ): RequestTiming {
    return {
      url,
      startTime,
      endTime,
      duration: endTime - startTime,
      timestamp: new Date().toISOString(),
      fromCache,
      ...additionalData,
    };
  }

  static async logRequest(timing: Omit<RequestTiming, "duration" | "timestamp">) {
    try {
      if (!(await this.isDebugEnabled())) return;

      const userId = await this.getCurrentUserId();
      await this.ensureDebugDir();
      const filePath = this.getLogFilePath(userId);

      const newTiming = this.createTiming(
        timing.url,
        timing.startTime,
        timing.endTime,
        timing.fromCache,
        {
          cacheType: timing.cacheType,
          mongoAccess: timing.mongoAccess,
          pageRender: timing.pageRender,
        }
      );

      // Utiliser un système d'append atomique
      await this.appendLog(filePath, newTiming);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du log:", error);
    }
  }

  static async getRequestLogs(): Promise<RequestTiming[]> {
    try {
      const userId = await this.getCurrentUserId();
      const filePath = this.getLogFilePath(userId);
      return await this.readLogs(filePath);
    } catch (error) {
      if (error instanceof AppError) throw error;
      return [];
    }
  }

  static async clearLogs(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const filePath = this.getLogFilePath(userId);
      await this.writeLogs(filePath, []);
    } catch (error) {
      if (error instanceof AppError) throw error;
    }
  }

  static async logPageRender(page: string, duration: number) {
    try {
      if (!(await this.isDebugEnabled())) return;

      const userId = await this.getCurrentUserId();
      await this.ensureDebugDir();
      const filePath = this.getLogFilePath(userId);

      const now = performance.now();
      const newTiming = this.createTiming(`Page Render: ${page}`, now - duration, now, false, {
        pageRender: { page, duration },
      });

      // Utiliser le même système d'append atomique
      await this.appendLog(filePath, newTiming);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du log de rendu:", error);
    }
  }

  static async measureMongoOperation<T>(operation: string, func: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      if (!(await this.isDebugEnabled())) {
        return func();
      }

      const result = await func();
      const endTime = performance.now();

      await this.logRequest({
        url: `MongoDB: ${operation}`,
        startTime,
        endTime,
        fromCache: false,
        mongoAccess: {
          operation,
          duration: endTime - startTime,
        },
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      await this.logRequest({
        url: `MongoDB Error: ${operation}`,
        startTime,
        endTime,
        fromCache: false,
        mongoAccess: {
          operation,
          duration: endTime - startTime,
        },
      });
      throw error;
    }
  }
}
