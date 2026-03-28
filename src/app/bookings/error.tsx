/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bookings Error Component
 */

'use client';

import { useLanguage } from '@/contexts';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer, BottomNav } from '@/components/dayf';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BookingsError({ error, reset }: ErrorProps) {
  const { language } = useLanguage();

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F5F0]">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {language === 'ar' ? 'حجوزاتي' : 'My Bookings'}
          </h1>
        </div>
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {language === 'ar' ? 'حدث خطأ' : 'Something went wrong'}
          </h3>
          <p className="text-gray-600 mb-6">
            {language === 'ar' 
              ? 'فشل في تحميل الحجوزات. يرجى المحاولة مرة أخرى.'
              : 'Failed to load bookings. Please try again.'}
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
      <Footer />
      <BottomNav />
    </main>
  );
}
