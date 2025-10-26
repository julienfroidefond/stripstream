/**
 * Service de gestion de queue pour limiter les requêtes concurrentes vers Komga
 * Évite de surcharger Komga avec trop de requêtes simultanées
 */
import logger from "@/lib/logger";

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeCount = 0;
  private maxConcurrent: number;
  private getMaxConcurrent: (() => Promise<number>) | null = null;

  constructor(maxConcurrent?: number) {
    // Valeur par défaut
    this.maxConcurrent = maxConcurrent ?? 5;
  }

  /**
   * Configure une fonction pour récupérer dynamiquement le max concurrent depuis les préférences
   */
  setMaxConcurrentGetter(getter: () => Promise<number>): void {
    this.getMaxConcurrent = getter;
  }

  /**
   * Récupère la valeur de maxConcurrent, soit depuis les préférences, soit depuis la valeur fixe
   */
  private async getCurrentMaxConcurrent(): Promise<number> {
    if (this.getMaxConcurrent) {
      try {
        return await this.getMaxConcurrent();
      } catch (error) {
        logger.error({ err: error }, 'Error getting maxConcurrent from preferences, using default');
        return this.maxConcurrent;
      }
    }
    return this.maxConcurrent;
  }

  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Limiter la taille de la queue pour éviter l'accumulation
      if (this.queue.length >= 50) {
        reject(new Error('Request queue is full - Komga may be overloaded'));
        return;
      }
      
      this.queue.push({ execute, resolve, reject });
      this.processQueue();
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processQueue(): Promise<void> {
    const maxConcurrent = await this.getCurrentMaxConcurrent();
    if (this.activeCount >= maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const request = this.queue.shift();

    if (!request) {
      this.activeCount--;
      return;
    }

    try {
      // Délai adaptatif : plus long si la queue est pleine
      const delayMs = this.queue.length > 10 ? 500 : 200;
      await this.delay(delayMs);
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }
}

// Singleton instance - Par défaut limite à 5 requêtes simultanées
export const RequestQueueService = new RequestQueue(5);

