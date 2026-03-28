/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Root Error Boundary
 * 
 * Error boundary جذرية للتعامل مع أخطاء التطبيق
 * حل جذري لمشكلة: "لا يوجد Error Boundaries"
 */

'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts';
import { AlertCircle, RefreshCcw, Home, Wifi, Server, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  const { language } = useLanguage();

  useEffect(() => {
    // Log error to error reporting service
    logger.error('Application Error', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  // Detect error type
  const getErrorInfo = () => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('networkerror')) {
      return {
        icon: Wifi,
        title: language === 'ar' ? 'لا يوجد اتصال' : 'No Connection',
        description: language === 'ar' 
          ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى.'
          : 'Check your internet connection and try again.',
      };
    }
    
    if (message.includes('500') || message.includes('internal') || message.includes('server')) {
      return {
        icon: Server,
        title: language === 'ar' ? 'خطأ في الخادم' : 'Server Error',
        description: language === 'ar'
          ? 'الخادم غير متاح حالياً. يرجى المحاولة لاحقاً.'
          : 'The server is temporarily unavailable. Please try again later.',
      };
    }
    
    if (message.includes('404') || message.includes('not found')) {
      return {
        icon: Search,
        title: language === 'ar' ? 'غير موجود' : 'Not Found',
        description: language === 'ar'
          ? 'عذراً، لم نتمكن من العثور على ما تبحث عنه.'
          : 'Sorry, we couldn\'t find what you\'re looking for.',
      };
    }
    
    return {
      icon: AlertCircle,
      title: language === 'ar' ? 'حدث خطأ' : 'Something went wrong',
      description: language === 'ar'
        ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
        : 'An unexpected error occurred. Please try again.',
    };
  };

  const errorInfo = getErrorInfo();
  const IconComponent = errorInfo.icon;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#F8F5F0] p-4" dir="rtl">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-red-50 flex items-center justify-center">
          <IconComponent className="w-12 h-12 text-red-500" />
        </div>

        {/* Error Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {errorInfo.title}
        </h1>

        {/* Error Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          {errorInfo.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-[#0D4D3A] hover:bg-[#1A5F4A] text-white rounded-xl px-8 py-3 font-semibold"
          >
            <RefreshCcw className="w-5 h-5 ml-2" />
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-8 py-3 font-semibold"
          >
            <Home className="w-5 h-5 ml-2" />
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </Button>
        </div>

        {/* Error ID for support */}
        {error.digest && (
          <p className="mt-8 text-xs text-gray-400">
            {language === 'ar' ? 'رمز الخطأ:' : 'Error ID:'} {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
