/**
 * Real-time Stats Endpoint
 * نقطة نهاية لإحصائيات الاتصالات
 * 
 * GET /api/realtime/stats
 */

import { NextResponse } from 'next/server';
import { getRealtimeStats } from '@/lib/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = getRealtimeStats();
  
  return NextResponse.json({
    success: true,
    ...stats,
    timestamp: new Date(),
  });
}
