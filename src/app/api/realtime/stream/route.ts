/**
 * Real-time SSE Stream Endpoint
 * نقطة نهاية SSE للاتصال في الوقت الحقيقي
 * 
 * GET /api/realtime/stream?userId=xxx&role=xxx
 * 
 * الحل الجذري:
 * - SSE يعمل على جميع الاستضافات
 * - لا يحتاج WebSocket Upgrade
 * - اتصال مستمر عبر HTTP
 */

import { NextRequest } from 'next/server';
import { realtimeStore } from '@/lib/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'anonymous';
  const role = searchParams.get('role') || 'guest';
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[Realtime] New SSE connection: ${connectionId} (user: ${userId}, role: ${role})`);

  // Create a TransformStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Register connection
      realtimeStore.registerConnection(connectionId, userId, role, controller);

      // Send initial connection confirmation
      const connectEvent = {
        id: `evt_connect_${Date.now()}`,
        type: 'connection.established',
        target: 'user' as const,
        targetId: userId,
        data: { connectionId, timestamp: new Date() },
        timestamp: new Date(),
      };
      controller.enqueue(`data: ${JSON.stringify(connectEvent)}\n\n`);

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
          realtimeStore.updateActivity(connectionId);
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle abort signal
      return () => {
        clearInterval(heartbeatInterval);
        realtimeStore.unregisterConnection(connectionId);
      };
    },

    cancel() {
      console.log(`[Realtime] Connection cancelled: ${connectionId}`);
      realtimeStore.unregisterConnection(connectionId);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
