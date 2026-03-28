/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bookings Loading Component
 */

'use client';

import { Loader2 } from 'lucide-react';
import { Header, Footer, BottomNav } from '@/components/dayf';

export default function BookingsLoading() {
  return (
    <main className="min-h-screen flex flex-col bg-[#F8F5F0]">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </div>
      <Footer />
      <BottomNav />
    </main>
  );
}
