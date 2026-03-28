/**
 * useSafeFetch Hook - Safe Data Fetching with Auto-Cleanup
 * Hook آمن لجلب البيانات مع التنظيف التلقائي
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة VI: الأمان والحماية
 * - منع Memory Leaks
 * - AbortController تلقائي
 * 
 * Usage:
 * ```tsx
 * const { data, error, isLoading, refetch } = useSafeFetch('/api/services');
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

interface UseSafeFetchOptions extends RequestInit {
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseSafeFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

// ============================================
// Hook Implementation
// ============================================

export function useSafeFetch<T = unknown>(
  url: string | null,
  options: UseSafeFetchOptions = {}
): UseSafeFetchResult<T> {
  const { enabled = true, onSuccess, onError, ...fetchOptions } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!url) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      // Check if still mounted
      if (!isMountedRef.current) return;

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 401) {
          const error = new Error('انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.');
          setState({ data: null, error, isLoading: false });
          onError?.(error);
          
          // Optionally redirect to login
          // window.location.href = '/login';
          return;
        }

        if (response.status === 403) {
          const error = new Error('ليس لديك صلاحية للوصول إلى هذا المحتوى.');
          setState({ data: null, error, isLoading: false });
          onError?.(error);
          return;
        }

        if (response.status === 429) {
          const error = new Error('كثرة الطلبات. يرجى الانتظار قبل المحاولة مرة أخرى.');
          setState({ data: null, error, isLoading: false });
          onError?.(error);
          return;
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if still mounted
      if (!isMountedRef.current) return;

      setState({ data, error: null, isLoading: false });
      onSuccess?.(data);

    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      // Check if still mounted
      if (!isMountedRef.current) return;

      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('[useSafeFetch] Error:', { error: err, url });
      
      setState({ data: null, error: err, isLoading: false });
      onError?.(err);
    }
  }, [url, fetchOptions, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (url && enabled) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, enabled, fetchData]);

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isError: state.error !== null,
    refetch,
  };
}

// ============================================
// useSafeMutation Hook
// ============================================

interface UseSafeMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
}

export function useSafeMutation<TData = unknown, TVariables = unknown>(
  url: string | ((variables: TVariables) => string),
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options: Omit<RequestInit, 'method' | 'body'> = {}
): UseSafeMutationResult<TData, TVariables> {
  const [state, setState] = useState<FetchState<TData>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      
      const response = await fetch(endpoint, {
        ...options,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: method !== 'DELETE' ? JSON.stringify(variables) : undefined,
      });

      if (!isMountedRef.current) return null;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.');
        }
        if (response.status === 403) {
          throw new Error('ليس لديك صلاحية لتنفيذ هذا الإجراء.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!isMountedRef.current) return null;

      setState({ data, error: null, isLoading: false });
      return data;

    } catch (error) {
      if (!isMountedRef.current) return null;

      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('[useSafeMutation] Error:', { error: err });
      
      setState({ data: null, error: err, isLoading: false });
      return null;
    }
  }, [url, method, options]);

  return {
    mutate,
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
  };
}

export default useSafeFetch;
