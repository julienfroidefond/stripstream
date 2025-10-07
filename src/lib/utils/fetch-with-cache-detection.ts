// Wrapper pour détecter le cache du navigateur
export async function fetchWithCacheDetection(url: string, options: RequestInit = {}) {
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, options);
    const endTime = performance.now();
    
    // Détecter si la réponse vient du cache du navigateur
    const fromBrowserCache = response.headers.get('x-cache') === 'HIT' || 
                            response.headers.get('cf-cache-status') === 'HIT' ||
                            (endTime - startTime) < 5; // Si très rapide, probablement du cache
    
    // Logger la requête seulement si ce n'est pas une requête de debug
    // Note: La vérification du mode debug se fait côté serveur dans DebugService
    if (!url.includes('/api/debug')) {
      try {
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url,
            startTime,
            endTime,
            fromCache: fromBrowserCache,
          }),
        });
      } catch {
        // Ignorer les erreurs de logging
      }
    }
    
    return response;
  } catch (error) {
    const endTime = performance.now();
    
    // Logger aussi les erreurs seulement si ce n'est pas une requête de debug
    if (!url.includes('/api/debug')) {
      try {
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url,
            startTime,
            endTime,
            fromCache: false,
          }),
        });
      } catch {
        // Ignorer les erreurs de logging
      }
    }
    
    throw error;
  }
}
