/**
 * Rate Limit UI Component
 * واجهة عرض حالة Rate Limiting
 * 
 * Features:
 * - Countdown timer
 * - Retry button
 * - User-friendly messages
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================
// Types
// ============================================

interface RateLimitError {
  isRateLimited: boolean;
  retryAfter: number; // seconds
  message: string;
}

interface RateLimitUIProps {
  error?: RateLimitError | null;
  onRetry?: () => void;
  className?: string;
}

// ============================================
// Component
// ============================================

export function RateLimitUI({ error, onRetry, className = '' }: RateLimitUIProps) {
  const [countdown, setCountdown] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!error?.isRateLimited || !error.retryAfter) {
      setCountdown(0);
      return;
    }

    setCountdown(error.retryAfter);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [error?.isRateLimited, error?.retryAfter]);

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes} دقيقة و ${secs} ثانية`;
    }
    return `${secs} ثانية`;
  }, []);

  if (!error?.isRateLimited) {
    return null;
  }

  return (
    <div 
      className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${className}`}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-bold text-amber-800 mb-1">
            كثرة الطلبات
          </h4>
          
          <p className="text-amber-700 text-sm mb-3">
            {error.message || 'يرجى الانتظار قبل إرسال طلب آخر'}
          </p>

          {countdown > 0 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-3">
              <Clock className="w-4 h-4" />
              <span>
                إعادة المحاولة بعد: <strong>{formatTime(countdown)}</strong>
              </span>
            </div>
          )}

          <Button
            onClick={onRetry}
            disabled={countdown > 0}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Hook for Rate Limit Detection
// ============================================

export function useRateLimit() {
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);

  const handleRateLimitResponse = useCallback((response: Response) => {
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      
      setRateLimitError({
        isRateLimited: true,
        retryAfter,
        message: 'تم تجاوز الحد المسموح من الطلبات',
      });
      
      return true;
    }
    
    return false;
  }, []);

  const clearRateLimit = useCallback(() => {
    setRateLimitError(null);
  }, []);

  return {
    rateLimitError,
    handleRateLimitResponse,
    clearRateLimit,
    RateLimitUI: ({ onRetry }: { onRetry?: () => void }) => (
      <RateLimitUI error={rateLimitError} onRetry={onRetry} />
    ),
  };
}

export default RateLimitUI;
