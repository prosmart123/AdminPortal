/**
 * API utility functions for timeout handling, caching, and retry logic
 */

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Wraps a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(
          new APIError(504, errorMessage || `Request timeout after ${timeoutMs}ms`)
        ),
        timeoutMs
      )
    )
  ]);
}

/**
 * Simple in-memory cache for API responses
 */
export class ResponseCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    // Default 5 minutes TTL
    this.ttlMs = ttlMs;
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  invalidatePattern(pattern: RegExp): void {
    // Use a workaround for ES5 compatibility
    const keysToDelete: string[] = [];
    // @ts-ignore - forEach is available on Map even in ES5
    this.cache.forEach(function(_: any, key: string) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Global cache instances
export const categoriesCache = new ResponseCache();
export const subcategoriesCache = new ResponseCache();
export const productsCache = new ResponseCache();

/**
 * Format error response for consistent API responses
 */
export function formatErrorResponse(error: any): {
  success: false;
  error: string;
  statusCode: number;
} {
  if (error instanceof APIError) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode
    };
  }

  if (error?.message?.includes('timeout')) {
    return {
      success: false,
      error: 'Request timeout - database is taking too long to respond. Please try again.',
      statusCode: 504
    };
  }

  return {
    success: false,
    error: error?.message || 'An unknown error occurred',
    statusCode: 500
  };
}
