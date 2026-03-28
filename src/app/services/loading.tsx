/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Services Loading Component
 */

'use client';

import { Loader2 } from 'lucide-react';

export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20" dir="rtl">
      <div className="bg-emerald-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-10 w-48 bg-white/20 rounded animate-pulse mb-4" />
          <div className="h-6 w-64 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </div>
    </div>
  );
}
