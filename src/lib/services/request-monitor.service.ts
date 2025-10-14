/**
 * Service de monitoring des requêtes concurrentes vers Komga
 * Permet de tracker le nombre de requêtes actives et d'alerter en cas de charge élevée
 */
class RequestMonitor {
  private activeRequests = 0;
  private readonly thresholds = {
    warning: 10,
    high: 20,
    critical: 30,
  };

  incrementActive(): number {
    this.activeRequests++;
    this.checkThresholds();
    return this.activeRequests;
  }

  decrementActive(): number {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    return this.activeRequests;
  }

  getActiveCount(): number {
    return this.activeRequests;
  }

  private checkThresholds(): void {
    const count = this.activeRequests;
    
    if (count >= this.thresholds.critical) {
      console.warn(`[REQUEST-MONITOR] 🔴 CRITICAL concurrency: ${count} active requests`);
    } else if (count >= this.thresholds.high) {
      console.warn(`[REQUEST-MONITOR] ⚠️  HIGH concurrency: ${count} active requests`);
    } else if (count >= this.thresholds.warning) {
      console.log(`[REQUEST-MONITOR] ⚡ Warning concurrency: ${count} active requests`);
    }
  }
}

// Singleton instance
export const RequestMonitorService = new RequestMonitor();


