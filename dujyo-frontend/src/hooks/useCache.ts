/**
 * Custom hook for intelligent caching with TTL
 */
import { useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function useCache<T>(
  ttl: number = 5 * 60 * 1000 // 5 minutes default
) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback(
    (key: string): T | null => {
      const entry = cacheRef.current.get(key);
      if (!entry) return null;

      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        cacheRef.current.delete(key);
        return null;
      }

      return entry.data;
    },
    []
  );

  const set = useCallback(
    (key: string, data: T, customTtl?: number) => {
      cacheRef.current.set(key, {
        data,
        timestamp: Date.now(),
        ttl: customTtl || ttl,
      });
    },
    [ttl]
  );

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const invalidate = useCallback((key: string) => {
    cacheRef.current.delete(key);
  }, []);

  return { get, set, clear, invalidate };
}

