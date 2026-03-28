/**
 * API Client - Unified HTTP Client with Error Handling
 * عميل API موحد مع معالجة الأخطاء
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة VI: الأمان والحماية
 * - معالجة موحدة للأخطاء
 * - AbortController للـ cleanup
 * 
 * Features:
 * - Automatic 401/403 handling
 * - Network error detection
 * - AbortController support
 * - Retry logic
 * - Request/Response interceptors
 */

// ============================================
// Types
// ============================================

export interface ApiClientOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuthRedirect?: boolean;
}

export interface ApiError {
  status: number;
  statusText: string;
  message: string;
  code: ErrorCode;
  details?: unknown;
}

export type ErrorCode = 
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
  ok: boolean;
}

// ============================================
// Error Classification
// ============================================

function classifyError(error: unknown, response?: Response): ApiError {
  // Network error (no response)
  if (!response) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          status: 0,
          statusText: 'Aborted',
          message: 'تم إلغاء الطلب',
          code: 'UNKNOWN',
        };
      }
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return {
          status: 408,
          statusText: 'Request Timeout',
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
          code: 'TIMEOUT',
        };
      }
      if (!navigator.onLine || error.message.includes('network') || error.message.includes('fetch')) {
        return {
          status: 0,
          statusText: 'Network Error',
          message: 'لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك.',
          code: 'NETWORK_ERROR',
        };
      }
    }
    return {
      status: 0,
      statusText: 'Unknown Error',
      message: 'حدث خطأ غير متوقع.',
      code: 'UNKNOWN',
      details: error,
    };
  }

  // HTTP status-based errors
  const status = response.status;
  const statusText = response.statusText;

  switch (status) {
    case 401:
      return {
        status,
        statusText,
        message: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
        code: 'UNAUTHORIZED',
      };
    case 403:
      return {
        status,
        statusText,
        message: 'ليس لديك صلاحية للوصول إلى هذا المحتوى.',
        code: 'FORBIDDEN',
      };
    case 404:
      return {
        status,
        statusText,
        message: 'المحتوى المطلوب غير موجود.',
        code: 'NOT_FOUND',
      };
    case 422:
      return {
        status,
        statusText,
        message: 'البيانات المدخلة غير صالحة.',
        code: 'VALIDATION_ERROR',
      };
    case 429:
      return {
        status,
        statusText,
        message: 'كثرة الطلبات. يرجى الانتظار قبل المحاولة مرة أخرى.',
        code: 'RATE_LIMITED',
      };
    default:
      if (status >= 500) {
        return {
          status,
          statusText,
          message: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.',
          code: 'SERVER_ERROR',
        };
      }
      return {
        status,
        statusText,
        message: `حدث خطأ: ${statusText}`,
        code: 'UNKNOWN',
      };
  }
}

// ============================================
// API Client Class
// ============================================

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private onUnauthorized: (() => void) | null = null;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    this.defaultTimeout = 30000;
    this.defaultRetries = 0;
  }

  /**
   * Set unauthorized callback (for redirect to login)
   */
  setUnauthorizedHandler(handler: () => void): void {
    this.onUnauthorized = handler;
  }

  /**
   * Create abort controller with timeout
   */
  private createAbortSignal(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  /**
   * Wait for retry
   */
  private async waitForRetry(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Make API request
   */
  async request<T>(
    endpoint: string,
    options: ApiClientOptions = {}
  ): Promise<ApiResult<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000,
      skipAuthRedirect = false,
      ...fetchOptions
    } = options;

    const controller = this.createAbortSignal(timeout);
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    let lastError: ApiError | null = null;
    let lastResponse: Response | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });

        lastResponse = response;

        // Handle successful response
        if (response.ok) {
          try {
            const data = await response.json();
            return {
              data,
              error: null,
              status: response.status,
              ok: true,
            };
          } catch {
            // Empty response
            return {
              data: null,
              error: null,
              status: response.status,
              ok: true,
            };
          }
        }

        // Handle error response
        const error = classifyError(null, response);
        lastError = error;

        // Handle 401 - redirect to login
        if (error.code === 'UNAUTHORIZED' && !skipAuthRedirect && this.onUnauthorized) {
          this.onUnauthorized();
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return {
            data: null,
            error,
            status: response.status,
            ok: false,
          };
        }

        // Retry on server errors or network issues
        if (attempt < retries) {
          await this.waitForRetry(retryDelay * (attempt + 1));
          continue;
        }

        return {
          data: null,
          error,
          status: response.status,
          ok: false,
        };

      } catch (error) {
        // Handle abort
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            data: null,
            error: classifyError(error),
            status: 0,
            ok: false,
          };
        }

        lastError = classifyError(error);

        // Retry on network errors
        if (attempt < retries) {
          await this.waitForRetry(retryDelay * (attempt + 1));
          continue;
        }

        return {
          data: null,
          error: lastError,
          status: 0,
          ok: false,
        };
      }
    }

    return {
      data: null,
      error: lastError,
      status: lastResponse?.status || 0,
      ok: false,
    };
  }

  // ============================================
  // Convenience Methods
  // ============================================

  async get<T>(endpoint: string, options?: ApiClientOptions): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: ApiClientOptions): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// ============================================
// Singleton Instance
// ============================================

export const apiClient = new ApiClient();

// ============================================
// Utility Functions
// ============================================

/**
 * Check if error is a specific error code
 */
export function isApiError(error: ApiError | null, code: ErrorCode): boolean {
  return error?.code === code;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: ApiError | null): string {
  return error?.message || 'حدث خطأ غير متوقع.';
}

/**
 * Check if should show retry button
 */
export function shouldRetry(error: ApiError | null): boolean {
  if (!error) return false;
  return ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(error.code);
}

export default apiClient;
