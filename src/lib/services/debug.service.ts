import fs from "fs/promises";
import path from "path";
import { CacheType } from "./base-api.service";
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
  private static getCurrentUserId(): string {
    const user = AuthServerService.getCurrentUser();
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

  static async logRequest(timing: Omit<RequestTiming, "duration" | "timestamp">) {
    try {
      const userId = await this.getCurrentUserId();
      const preferences = await PreferencesService.getPreferences();
      if (!preferences.debug) {
        return;
      }
      await this.ensureDebugDir();
      const filePath = this.getLogFilePath(userId);

      let logs: RequestTiming[] = [];
      try {
        const content = await fs.readFile(filePath, "utf-8");
        logs = JSON.parse(content);
      } catch {
        // Le fichier n'existe pas encore ou est vide
      }

      const newTiming: RequestTiming = {
        ...timing,
        duration: timing.endTime - timing.startTime,
        timestamp: new Date().toISOString(),
      };

      // Garde les 100 dernières requêtes
      logs = [...logs.slice(-99), newTiming];

      await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      // On ignore les erreurs de logging mais on les trace quand même
      console.error("Erreur lors de l'enregistrement du log:", error);
    }
  }

  static async getRequestLogs(): Promise<RequestTiming[]> {
    try {
      const userId = await this.getCurrentUserId();
      const filePath = this.getLogFilePath(userId);
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      return [];
    }
  }

  static async clearLogs(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const filePath = this.getLogFilePath(userId);
      await fs.writeFile(filePath, "[]");
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      // On ignore les autres erreurs si le fichier n'existe pas
    }
  }

  static async logPageRender(page: string, duration: number) {
    try {
      const userId = await this.getCurrentUserId();
      const preferences = await PreferencesService.getPreferences();
      if (!preferences.debug) {
        return;
      }
      await this.ensureDebugDir();
      const filePath = this.getLogFilePath(userId);

      let logs: RequestTiming[] = [];
      try {
        const content = await fs.readFile(filePath, "utf-8");
        logs = JSON.parse(content);
      } catch {
        // Le fichier n'existe pas encore ou est vide
      }

      const now = performance.now();
      const newTiming: RequestTiming = {
        url: `Page Render: ${page}`,
        startTime: now - duration,
        endTime: now,
        duration,
        timestamp: new Date().toISOString(),
        fromCache: false,
        pageRender: {
          page,
          duration,
        },
      };

      // Garde les 100 dernières requêtes
      logs = [...logs.slice(-99), newTiming];

      await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      // On ignore les erreurs de logging mais on les trace quand même
      console.error("Erreur lors de l'enregistrement du log de rendu:", error);
    }
  }

  static async measureMongoOperation<T>(operation: string, func: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const preferences = await PreferencesService.getPreferences();
      if (!preferences.debug) {
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
