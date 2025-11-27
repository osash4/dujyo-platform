/**
 * Custom hook for retry logic with exponential backoff
 */
import { useCallback, useRef } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  const retry = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let lastError: Error | null = null;
      let delay = initialDelay;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt === maxAttempts) {
            throw lastError;
          }

          // Wait before retrying with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }

      throw lastError || new Error('Retry failed');
    },
    [fn, maxAttempts, initialDelay, maxDelay, backoffMultiplier]
  );

  return retry as T;
}

