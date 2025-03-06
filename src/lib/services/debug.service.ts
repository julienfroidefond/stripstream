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
      return [];
    }
  }

  private static async writeLogs(filePath: string, logs: RequestTiming[]): Promise<void> {
    const trimmedLogs = logs.slice(-99);
    await fs.writeFile(filePath, JSON.stringify(trimmedLogs, null, 2));
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

      const logs = await this.readLogs(filePath);
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

      await this.writeLogs(filePath, [...logs, newTiming]);
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

      const logs = await this.readLogs(filePath);
      const now = performance.now();
      const newTiming = this.createTiming(`Page Render: ${page}`, now - duration, now, false, {
        pageRender: { page, duration },
      });

      await this.writeLogs(filePath, [...logs, newTiming]);
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
