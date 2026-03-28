/**
 * Community Error Boundary
 * حدود خطأ صفحة المجتمع
 */

'use client';

import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CommunityError({ error, reset }: ErrorProps) {
  return (
    <div 
      className="min-h-[60vh] flex items-center justify-center p-8"
      dir="rtl"
    >
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            حدث خطأ في تحميل المجتمع
          </h2>

          <p className="text-gray-600 mb-6">
            لم نتمكن من تحميل المواضيع. يرجى المحاولة مرة أخرى.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RefreshCcw className="w-4 h-4 ml-2" />
              إعادة المحاولة
            </Button>

            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="border-gray-300"
            >
              <Home className="w-4 h-4 ml-2" />
              الصفحة الرئيسية
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
