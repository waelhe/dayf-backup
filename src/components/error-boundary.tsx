/**
 * Page Error Boundary - Unified Error Handling for Pages
 * حدود الخطأ الموحدة للصفحات
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة VI: الأمان والحماية
 * - تجربة مستخدم متسقة
 * 
 * Features:
 * - Consistent error UI
 * - Retry functionality
 * - Error logging
 * - RTL support
 */

'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================
// Error Boundary Component
// ============================================

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error
    logger.error('[PageErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    this.props.onReset?.();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleGoBack = (): void => {
    window.history.back();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, showHomeButton = true } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div 
          className="min-h-[50vh] flex items-center justify-center p-8"
          dir="rtl"
        >
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                حدث خطأ غير متوقع
              </h2>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                نعتذر عن هذا الإزعاج. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left overflow-auto max-h-40">
                  <code className="text-xs text-red-600 whitespace-pre-wrap">
                    {error.message}
                  </code>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <RefreshCcw className="w-4 h-4 ml-2" />
                  إعادة المحاولة
                </Button>

                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  className="border-gray-300"
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  العودة
                </Button>

                {showHomeButton && (
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="border-gray-300"
                  >
                    <Home className="w-4 h-4 ml-2" />
                    الصفحة الرئيسية
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// ============================================
// Wrapper Component
// ============================================

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  pageName?: string;
}

export function ErrorBoundaryWrapper({ children, pageName }: ErrorBoundaryWrapperProps) {
  return (
    <PageErrorBoundary
      onReset={() => {
        logger.info(`[ErrorBoundary] Reset triggered for page: ${pageName || 'unknown'}`);
      }}
    >
      {children}
    </PageErrorBoundary>
  );
}

// ============================================
// Async Error Boundary
// ============================================

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AsyncErrorBoundary({ children, fallback }: AsyncErrorBoundaryProps) {
  return (
    <PageErrorBoundary fallback={fallback}>
      {children}
    </PageErrorBoundary>
  );
}

export default PageErrorBoundary;
