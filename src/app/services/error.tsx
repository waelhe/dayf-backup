/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Services Error Component
 */

'use client';

import { useLanguage } from '@/contexts';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ServicesError({ error, reset }: ErrorProps) {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 pt-20" dir="rtl">
      <div className="bg-emerald-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'استكشف الخدمات' : 'Explore Services'}
          </h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {language === 'ar' ? 'حدث خطأ' : 'Something went wrong'}
          </h3>
          <p className="text-gray-600 mb-6">
            {language === 'ar' 
              ? 'فشل في تحميل الخدمات. يرجى المحاولة مرة أخرى.'
              : 'Failed to load services. Please try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700">
              <RefreshCcw className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <Home className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
