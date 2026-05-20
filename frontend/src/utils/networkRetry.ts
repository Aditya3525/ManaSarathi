/**
 * Network Request Retry Strategy
 * 
 * Implements exponential backoff with jitter for failed requests
 * Automatically retries transient failures (5xx, network errors, timeouts)
 * Does NOT retry client errors (4xx) except specific cases
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  retryableStatusCodes?: Set<number>;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

interface RetryableError extends Error {
  statusCode?: number;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableStatusCodes: new Set([408, 429, 500, 502, 503, 504]),
  shouldRetry: (error: Error, attempt: number) => {
    if (attempt >= DEFAULT_RETRY_OPTIONS.maxAttempts) return false;

    const err = error as RetryableError;

    // Retry on network errors
    if (err.isNetworkError || err.isTimeoutError) {
      return true;
    }

    // Retry on specific server status codes
    if (
      err.statusCode &&
      DEFAULT_RETRY_OPTIONS.retryableStatusCodes.has(err.statusCode)
    ) {
      return true;
    }

    return false;
  },
};

/**
 * Calculate exponential backoff with jitter
 */function calculateBackoffDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const exponentialDelay = Math.min(
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1),
    options.maxDelayMs
  );

  const jitter =
    exponentialDelay * options.jitterFactor * Math.random();

  return exponentialDelay + jitter;
}

/**
 * Wraps a fetch call with automatic retry logic
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number },
  retryOptions?: RetryOptions
): Promise<Response> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: RetryableError | null = null;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = init?.timeout || 30000;

      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response status is retryable
      if (
        !response.ok &&
        options.retryableStatusCodes.has(response.status)
      ) {
        const error: RetryableError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
        error.statusCode = response.status;

        if (options.shouldRetry(error, attempt)) {
          lastError = error;

          if (attempt < options.maxAttempts) {
            const delayMs = calculateBackoffDelay(attempt, options);
            await sleep(delayMs);
            continue;
          }
        }

        return response; // Return 4xx responses without retry
      }

      return response; // Success - return response
    } catch (error) {
      const err = error as RetryableError;

      // Classify error type
      if (error instanceof TypeError) {
        if (error.message.includes('signal')) {
          err.isTimeoutError = true;
        } else {
          err.isNetworkError = true;
        }
      }

      if (options.shouldRetry(err, attempt)) {
        lastError = err;

        if (attempt < options.maxAttempts) {
          const delayMs = calculateBackoffDelay(attempt, options);
          await sleep(delayMs);
          continue;
        }
      }

      throw err; // Don't retry this error
    }
  }

  // All retries exhausted
  if (lastError) {
    throw lastError;
  }

  throw new Error('Unknown error after all retries');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Request deduplication - prevents duplicate concurrent requests
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<Response>>();

  async dedupedFetch(
    key: string,
    fetcher: () => Promise<Response>
  ): Promise<Response> {
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing;
    }

    const promise = fetcher().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();
