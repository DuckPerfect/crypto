// Optimized API manager with request batching and caching
class APIManager {
  constructor() {
    this.cache = new CacheManager();
    this.requestQueue = new Map();
    this.batchTimeout = 50; // ms
    this.maxRetries = 3;
    this.baseDelay = 1000; // ms
  }

  // Batch multiple requests
  async batchRequest(requests) {
    const batchKey = JSON.stringify(requests.map(r => r.url).sort());
    
    if (this.requestQueue.has(batchKey)) {
      return this.requestQueue.get(batchKey);
    }

    const batchPromise = this.executeBatch(requests);
    this.requestQueue.set(batchKey, batchPromise);
    
    // Clean up after batch completes
    batchPromise.finally(() => {
      this.requestQueue.delete(batchKey);
    });

    return batchPromise;
  }

  async executeBatch(requests) {
    const results = await Promise.allSettled(
      requests.map(request => this.makeRequest(request))
    );

    return results.map((result, index) => ({
      url: requests[index].url,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  // Make optimized request with caching and retry logic
  async makeRequest({ url, options = {}, cacheKey, cacheTTL, retries = 0 }) {
    // Check cache first
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache successful response
      if (cacheKey) {
        this.cache.set(cacheKey, data, cacheTTL);
      }

      return data;

    } catch (error) {
      // Retry logic with exponential backoff
      if (retries < this.maxRetries && !error.name === 'AbortError') {
        const delay = this.baseDelay * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest({ url, options, cacheKey, cacheTTL, retries: retries + 1 });
      }

      throw error;
    }
  }

  // Preload data
  async preload(requests) {
    return Promise.allSettled(
      requests.map(request => this.makeRequest(request))
    );
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Export for use in main script
window.APIManager = APIManager;