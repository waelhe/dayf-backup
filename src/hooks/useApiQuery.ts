/**
 * useApiQuery Hook - Unified Data Fetching
 * Hook موحد لجلب البيانات
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة VI: الأمان والحماية
 * - AbortController للتطهير
 * - Error handling موحد
 * 
 * Features:
 * - Automatic AbortController
 * - Loading states
 * - Error handling
 * - Retry logic
 * - Refetch capability
 * - Caching option
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, ApiError, ApiClientOptions, ApiResult } from '@/lib/api-client';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface UseApiQueryOptions<T> extends ApiClientOptions {
  enabled?: boolean;
  cacheKey?: string;
  cacheTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  initialData?: T | null;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
  reset: () => void;
}

// ============================================
// Simple Cache
// ============================================

const cache = new Map<string, { data: unknown; timestamp: number }>();

function getFromCache<T>(key: string, cacheTime: number): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cacheTime) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(key: string): void {
  cache.delete(key);
}

// ============================================
// Hook Implementation
// ============================================

export function useApiQuery<T>(
  endpoint: string | null,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const {
    enabled = true,
    cacheKey,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError,
    initialData = null,
    ...clientOptions
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // ============================================
  // Fetch Function
  // ============================================

  const fetchData = useCallback(async (showLoading = true) => {
    // Check cache first
    if (cacheKey) {
      const cached = getFromCache<T>(cacheKey, cacheTime);
      if (cached !== null) {
        setData(cached);
        setError(null);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (showLoading) {
      setIsLoading(true);
    }
    setIsFetching(true);
    setError(null);

    try {
      const result: ApiResult<T> = await apiClient.get<T>(endpoint!, {
        ...clientOptions,
        signal: abortControllerRef.current.signal,
      });

      // Check if still mounted
      if (!isMountedRef.current) return;

      if (result.ok && result.data !== null) {
        setData(result.data);
        setError(null);
        
        // Update cache
        if (cacheKey) {
          setCache(cacheKey, result.data);
        }
        
        // Call success callback
        onSuccess?.(result.data);
      } else if (result.error) {
        setError(result.error);
        
        // Call error callback
        onError?.(result.error);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      logger.error('[useApiQuery] Fetch error:', { error: err, endpoint });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [endpoint, cacheKey, cacheTime, clientOptions, onSuccess, onError]);

  // ============================================
  // Initial Fetch
  // ============================================

  useEffect(() => {
    isMountedRef.current = true;

    if (endpoint && enabled) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [endpoint, enabled, fetchData]);

  // ============================================
  // Actions
  // ============================================

  const refetch = useCallback(async () => {
    if (cacheKey) {
      invalidateCache(cacheKey);
    }
    await fetchData(false);
  }, [fetchData, cacheKey]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
    setIsFetching(false);
    if (cacheKey) {
      invalidateCache(cacheKey);
    }
  }, [initialData, cacheKey]);

  // ============================================
  // Return
  // ============================================

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    isFetching,
    refetch,
    reset,
  };
}

// ============================================
// Mutation Hook
// ============================================

export interface UseApiMutationOptions<TData, TVariables> extends ApiClientOptions {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError, variables: TVariables) => void;
}

export interface UseApiMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<ApiResult<TData>>;
  data: TData | null;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
}

export function useApiMutation<TData, TVariables>(
  endpoint: string | ((variables: TVariables) => string),
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options: UseApiMutationOptions<TData, TVariables> = {}
): UseApiMutationResult<TData, TVariables> {
  const { onSuccess, onError, ...clientOptions } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(async (variables: TVariables): Promise<ApiResult<TData>> => {
    setIsLoading(true);
    setError(null);

    const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;

    try {
      const result = await apiClient.request<TData>(url, {
        ...clientOptions,
        method,
        body: method !== 'DELETE' ? variables : undefined,
      });

      if (!isMountedRef.current) {
        return result;
      }

      if (result.ok) {
        setData(result.data);
        setError(null);
        onSuccess?.(result.data!, variables);
      } else {
        setError(result.error);
        onError?.(result.error!, variables);
      }

      return result;
    } catch (err) {
      const apiError: ApiError = {
        status: 0,
        statusText: 'Unknown Error',
        message: 'حدث خطأ غير متوقع.',
        code: 'UNKNOWN',
        details: err,
      };

      if (isMountedRef.current) {
        setError(apiError);
        onError?.(apiError, variables);
      }

      return {
        data: null,
        error: apiError,
        status: 0,
        ok: false,
      };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [endpoint, method, clientOptions, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    reset,
  };
}

// ============================================
// Utilities
// ============================================

/**
 * Invalidate all cache
 */
export function invalidateAllCache(): void {
  cache.clear();
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCacheByPattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export default useApiQuery;
