/**
 * Real-time Event Emit Endpoint
 * نقطة نهاية لإرسال الأحداث
 * 
 * POST /api/realtime/emit
 * 
 * Body: { target, targetId, event, data }
 */

import { NextRequest, NextResponse } from 'next/server';
import { realtimeStore, emitToUser, emitToRole, broadcastEvent } from '@/lib/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EmitRequest {
  target: 'user' | 'role' | 'booking' | 'dispute' | 'broadcast';
  targetId: string;
  event: string;
  data: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EmitRequest;
    const { target, targetId, event, data } = body;

    if (!target || !event) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: target, event' },
        { status: 400 }
      );
    }

    let sent = 0;

    switch (target) {
      case 'user':
        sent = realtimeStore.emitToUser(targetId, event, data);
        break;
      case 'role':
        sent = realtimeStore.emitToRole(targetId, event, data);
        break;
      case 'broadcast':
        sent = realtimeStore.broadcast(event, data);
        break;
      case 'booking':
      case 'dispute':
        // For rooms, emit to all users (simplified)
        sent = realtimeStore.broadcast(`${target}:${targetId}:${event}`, data);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Invalid target: ${target}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      emitted: { target, targetId, event },
      connectionsReached: sent,
    });
  } catch (error) {
    console.error('[Realtime] Emit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to emit event' },
      { status: 500 }
    );
  }
}
