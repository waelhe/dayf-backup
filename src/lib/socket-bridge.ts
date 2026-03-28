/**
 * Socket.io Bridge - Now using In-Process Realtime System
 * جسر Socket.io - الآن يستخدم النظام الداخلي
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة V: الاستقلالية بين الوحدات عبر الأحداث فقط
 * - In-Process: لا شبكة، لا localhost، لا خدمات منفصلة
 * 
 * الحل الجذري:
 * - جميع الأحداث تمر داخل نفس العملية
 * - SSE للفرونت إند
 * - EventEmitter2 للباك إند
 * - لا يوجد network calls
 */

// ============================================
// Import from new realtime system
// ============================================

export {
  emitToUser,
  emitToRole,
  emitToBooking,
  emitToDispute,
  broadcastEvent,
  sendNotification as sendSocketNotification,
  getRealtimeStats,
  realtimeStore,
  type RealtimeEvent,
  type NotificationPayload,
} from './realtime';

// ============================================
// Compatibility Functions
// ============================================

/**
 * Check if realtime system is healthy
 * Always returns true since it's in-process
 */
export async function isSocketServiceHealthy(): Promise<boolean> {
  return true;
}

/**
 * Get online users count
 */
export async function getOnlineUsers(): Promise<{ count: number; users: string[] } | null> {
  const { getRealtimeStats } = await import('./realtime');
  const stats = getRealtimeStats();
  return {
    count: stats.uniqueUsers,
    users: stats.users,
  };
}

/**
 * Legacy emit to socket function (now in-process)
 */
export async function emitToSocket(options: {
  targetType: 'user' | 'role' | 'booking' | 'dispute' | 'broadcast';
  targetId: string;
  event: string;
  data: unknown;
}): Promise<{ success: boolean; error?: string }> {
  const { realtimeStore } = await import('./realtime');
  
  try {
    let sent = 0;
    
    switch (options.targetType) {
      case 'user':
        sent = realtimeStore.emitToUser(options.targetId, options.event, options.data);
        break;
      case 'role':
        sent = realtimeStore.emitToRole(options.targetId, options.event, options.data);
        break;
      case 'broadcast':
        sent = realtimeStore.broadcast(options.event, options.data);
        break;
      case 'booking':
      case 'dispute':
        sent = realtimeStore.broadcast(`${options.targetType}:${options.targetId}:${options.event}`, options.data);
        break;
    }
    
    return { success: sent > 0 };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
