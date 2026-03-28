/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Root Loading Component
 * 
 * مكون التحميل الجذري للصفحات
 */

'use client';

import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#F8F5F0]" dir="rtl">
      <div className="text-center">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#0D4D3A] flex items-center justify-center">
          <span className="text-white font-bold text-2xl font-serif">ض</span>
        </div>
        
        {/* Loading Spinner */}
        <Loader2 className="w-10 h-10 animate-spin text-[#0D4D3A] mx-auto" />
        
        {/* Loading Text */}
        <p className="mt-4 text-gray-600 font-medium">
          جاري التحميل...
        </p>
      </div>
    </main>
  );
}
