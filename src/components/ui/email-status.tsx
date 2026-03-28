/**
 * Email Status Display Component
 * واجهة عرض حالة الإيميل
 * 
 * Features:
 * - Email verification status
 * - Resend verification option
 * - Email delivery status
 */

'use client';

import { useState, useCallback } from 'react';
import { Mail, CheckCircle, AlertCircle, RefreshCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export type EmailStatus = 'unverified' | 'pending' | 'verified' | 'failed';

interface EmailStatusProps {
  email: string;
  status: EmailStatus;
  onResendVerification?: () => Promise<boolean>;
  className?: string;
}

interface EmailStatusResult {
  success: boolean;
  message: string;
  retryAfter?: number;
}

// ============================================
// Component
// ============================================

export function EmailStatusDisplay({ 
  email, 
  status, 
  onResendVerification,
  className = '' 
}: EmailStatusProps) {
  const [isResending, setIsResending] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);

  const handleResend = useCallback(async () => {
    if (!onResendVerification || isResending) return;

    setIsResending(true);
    try {
      const result = await onResendVerification();
      if (result) {
        setLastSent(new Date());
      }
    } catch (error) {
      logger.error('[EmailStatus] Resend failed:', { error });
    } finally {
      setIsResending(false);
    }
  }, [onResendVerification, isResending]);

  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          iconColor: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          title: 'البريد الإلكتروني موثق',
          message: email,
          showButton: false,
        };
      case 'pending':
        return {
          icon: Clock,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          title: 'في انتظار التحقق',
          message: 'تم إرسال رابط التحقق إلى بريدك الإلكتروني',
          showButton: true,
          buttonText: 'إعادة الإرسال',
        };
      case 'failed':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'فشل التحقق',
          message: 'حدث خطأ أثناء إرسال رابط التحقق',
          showButton: true,
          buttonText: 'إعادة المحاولة',
        };
      case 'unverified':
      default:
        return {
          icon: Mail,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'البريد غير موثق',
          message: 'يرجى توثيق بريدك الإلكتروني',
          showButton: true,
          buttonText: 'إرسال رابط التحقق',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 ${className}`}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 mb-1">
            {config.title}
          </h4>
          
          <p className="text-gray-600 text-sm mb-2">
            {config.message}
          </p>

          {status !== 'verified' && (
            <p className="text-gray-500 text-xs mb-3" dir="ltr">
              {email}
            </p>
          )}

          {lastSent && status === 'pending' && (
            <p className="text-gray-500 text-xs mb-3">
              آخر إرسال: {lastSent.toLocaleTimeString('ar-SA')}
            </p>
          )}

          {config.showButton && onResendVerification && (
            <Button
              onClick={handleResend}
              disabled={isResending}
              variant="outline"
              size="sm"
              className={`
                ${status === 'failed' ? 'border-red-300 text-red-700 hover:bg-red-100' : ''}
                ${status === 'pending' ? 'border-amber-300 text-amber-700 hover:bg-amber-100' : ''}
                ${status === 'unverified' ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : ''}
                disabled:opacity-50
              `}
            >
              <RefreshCcw className={`w-4 h-4 ml-2 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'جاري الإرسال...' : config.buttonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Verification Banner Component
// ============================================

interface VerificationBannerProps {
  email: string;
  isVerified: boolean;
  onResend: () => Promise<boolean>;
  onDismiss?: () => void;
}

export function VerificationBanner({ 
  email, 
  isVerified, 
  onResend,
  onDismiss 
}: VerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(!isVerified);

  if (isVerified || !isVisible) {
    return null;
  }

  return (
    <div 
      className="bg-blue-50 border-b border-blue-200 px-4 py-3"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-blue-500" />
          <p className="text-blue-800 text-sm">
            <strong>تنبيه:</strong> بريدك الإلكتروني <span className="font-mono" dir="ltr">{email}</span> غير موثق
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={onResend}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            إرسال رابط التحقق
          </Button>
          
          {onDismiss && (
            <Button
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:bg-blue-100"
            >
              لاحقاً
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Hook for Email Verification
// ============================================

export function useEmailVerification(initialStatus: EmailStatus = 'unverified') {
  const [status, setStatus] = useState<EmailStatus>(initialStatus);
  const [lastSent, setLastSent] = useState<Date | null>(null);

  const sendVerification = useCallback(async (email: string): Promise<EmailStatusResult> => {
    try {
      setStatus('pending');
      
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setLastSent(new Date());
        return { success: true, message: 'تم إرسال رابط التحقق' };
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        setStatus('pending');
        return { 
          success: false, 
          message: 'يرجى الانتظار قبل إرسال طلب آخر',
          retryAfter 
        };
      }

      setStatus('failed');
      return { success: false, message: 'فشل إرسال رابط التحقق' };
    } catch (error) {
      setStatus('failed');
      return { success: false, message: 'حدث خطأ غير متوقع' };
    }
  }, []);

  const markVerified = useCallback(() => {
    setStatus('verified');
  }, []);

  const resetStatus = useCallback(() => {
    setStatus('unverified');
  }, []);

  return {
    status,
    lastSent,
    sendVerification,
    markVerified,
    resetStatus,
  };
}

export default EmailStatusDisplay;
