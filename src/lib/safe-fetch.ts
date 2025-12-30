/**
 * Safe fetch wrapper with proper error handling
 * Prevents JSON.parse errors when response is HTML error page
 */

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | FormData;
  timeout?: number;
}

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

/**
 * Safe fetch wrapper that:
 * - Validates response is actually JSON before parsing
 * - Has timeout protection
 * - Returns proper error messages
 */
export async function safeFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const timeout = options.timeout || 30000; // 30 second default timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    } as RequestInit);

    clearTimeout(timeoutId);

    // Check for network/timeout errors
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      // Try to extract error message
      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If JSON parse fails, use status message
        }
      }

      throw new SafeFetchError(errorMessage, response.status);
    }

    // Ensure response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new SafeFetchError(
        `Invalid response format: expected JSON but got ${contentType || 'unknown'}. Response: ${text.substring(0, 100)}`,
        response.status
      );
    }

    // Parse JSON safely
    try {
      const data = await response.json();
      return data as T;
    } catch (error) {
      throw new SafeFetchError(
        'Failed to parse response as JSON',
        response.status,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof SafeFetchError) {
      throw error;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new SafeFetchError(
        'Network error: unable to reach server. Please check your connection.',
        0,
        error
      );
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SafeFetchError(
        `Request timeout after ${timeout}ms. Server is not responding.`,
        504,
        error
      );
    }

    throw new SafeFetchError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Retry wrapper for fetch with exponential backoff
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: FetchOptions & { maxRetries?: number } = {},
  retryAttempt = 0
): Promise<T> {
  const maxRetries = options.maxRetries || 2;

  try {
    return await safeFetch<T>(url, options);
  } catch (error) {
    if (
      retryAttempt < maxRetries &&
      error instanceof SafeFetchError &&
      (error.statusCode === 504 || error.statusCode === 503 || error.statusCode === 0)
    ) {
      // Wait with exponential backoff
      const waitTime = Math.pow(2, retryAttempt) * 500; // 500ms, 1s, 2s, etc.
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchWithRetry<T>(url, options, retryAttempt + 1);
    }
    throw error;
  }
}
