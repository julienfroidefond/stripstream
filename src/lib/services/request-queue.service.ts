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

  constructor(maxConcurrent?: number) {
    // Lire depuis env ou utiliser la valeur par défaut
    const envValue = process.env.KOMGA_MAX_CONCURRENT_REQUESTS;
    this.maxConcurrent = maxConcurrent ?? (envValue ? parseInt(envValue, 10) : 5);
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

// Singleton instance - Par défaut limite à 2 requêtes simultanées (configurable via KOMGA_MAX_CONCURRENT_REQUESTS)
export const RequestQueueService = new RequestQueue(
  process.env.KOMGA_MAX_CONCURRENT_REQUESTS 
    ? parseInt(process.env.KOMGA_MAX_CONCURRENT_REQUESTS, 10) 
    : 2
);

