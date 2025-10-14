/**
 * Service de gestion de queue pour limiter les requêtes concurrentes vers Komga
 * Évite de surcharger Komga avec trop de requêtes simultanées
 */

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeCount = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ execute, resolve, reject });
      this.processQueue();
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processQueue(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const request = this.queue.shift();

    if (!request) {
      this.activeCount--;
      return;
    }

    try {
      // Délai de 200ms entre chaque requête pour espacer la charge CPU sur Komga
      await this.delay(200);
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

// Singleton instance - Limite à 2 requêtes simultanées vers Komga (réduit pour CPU)
export const RequestQueueService = new RequestQueue(2);

