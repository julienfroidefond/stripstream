/**
 * Circuit Breaker pour éviter de surcharger Komga quand il est défaillant
 * Évite l'effet avalanche en coupant les requêtes vers un service défaillant
 */
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

  private readonly config = {
    failureThreshold: 5, // Nombre d'échecs avant ouverture
    recoveryTimeout: 30000, // 30s avant tentative de récupération
    successThreshold: 3, // Nombre de succès pour fermer le circuit
  };

  async execute<T>(operation: () => Promise<T>): Promise<T> {
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
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state.state === 'HALF_OPEN') {
      this.state.failureCount = 0;
      this.state.state = 'CLOSED';
      console.log('[CIRCUIT-BREAKER] ✅ Circuit closed - Komga recovered');
    }
  }

  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = 'OPEN';
      this.state.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      console.warn(`[CIRCUIT-BREAKER] 🔴 Circuit OPEN - Komga failing (${this.state.failureCount} failures)`);
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
    console.log('[CIRCUIT-BREAKER] 🔄 Circuit reset');
  }
}

export const CircuitBreakerService = new CircuitBreaker();
