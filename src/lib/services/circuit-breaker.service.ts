/**
 * Circuit Breaker pour éviter de surcharger Komga quand il est défaillant
 * Évite l'effet avalanche en coupant les requêtes vers un service défaillant
 */
import type { CircuitBreakerConfig } from "@/types/preferences";
import logger from "@/lib/logger";

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    state: 'CLOSED',
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0,
  };

  private config = {
    failureThreshold: 5, // Nombre d'échecs avant ouverture
    recoveryTimeout: 30000, // 30s avant tentative de récupération
    resetTimeout: 60000, // Délai de reset après échec
  };

  private getConfigFromPreferences: (() => Promise<CircuitBreakerConfig>) | null = null;

  /**
   * Configure une fonction pour récupérer dynamiquement la config depuis les préférences
   */
  setConfigGetter(getter: () => Promise<CircuitBreakerConfig>): void {
    this.getConfigFromPreferences = getter;
  }

  /**
   * Récupère la config actuelle, soit depuis les préférences, soit depuis les valeurs par défaut
   */
  private async getCurrentConfig(): Promise<typeof this.config> {
    if (this.getConfigFromPreferences) {
      try {
        const prefConfig = await this.getConfigFromPreferences();
        return {
          failureThreshold: prefConfig.threshold ?? 5,
          recoveryTimeout: prefConfig.timeout ?? 30000,
          resetTimeout: prefConfig.resetTimeout ?? 60000,
        };
      } catch (error) {
        logger.error({ err: error }, 'Error getting circuit breaker config from preferences');
        return this.config;
      }
    }
    return this.config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const config = await this.getCurrentConfig();
    
    if (this.state.state === 'OPEN') {
      if (Date.now() < this.state.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - Komga service unavailable');
      }
      this.state.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure(config);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state.state === 'HALF_OPEN') {
      this.state.failureCount = 0;
      this.state.state = 'CLOSED';
      logger.info('[CIRCUIT-BREAKER] ✅ Circuit closed - Komga recovered');
    }
  }

  private async onFailure(config: typeof this.config): Promise<void> {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= config.failureThreshold) {
      this.state.state = 'OPEN';
      this.state.nextAttemptTime = Date.now() + config.resetTimeout;
      logger.warn(`[CIRCUIT-BREAKER] 🔴 Circuit OPEN - Komga failing (${this.state.failureCount} failures, reset in ${config.resetTimeout}ms)`);
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
    logger.info('[CIRCUIT-BREAKER] 🔄 Circuit reset');
  }
}

export const CircuitBreakerService = new CircuitBreaker();
