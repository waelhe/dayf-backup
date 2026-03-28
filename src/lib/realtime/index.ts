/**
 * Real-time Events System - SSE + HTTP
 * نظام الأحداث في الوقت الحقيقي
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة V: الاستقلالية بين الوحدات عبر الأحداث فقط
 * - SSE: يعمل على جميع الاستضافات (Vercel, Render, Railway)
 * - In-Process: لا يحتاج خدمات منفصلة
 * 
 * الحل الجذري:
 * - لا WebSocket Upgrade مطلوب
 * - لا خدمة منفصلة على port آخر
 * - لا localhost URL
 * - يعمل عبر HTTP العادي
 */

// ============================================
// Types
// ============================================

export interface RealtimeEvent {
  id: string;
  type: string;
  target: 'user' | 'role' | 'booking' | 'dispute' | 'broadcast';
  targetId: string;
  data: unknown;
  timestamp: Date;
}

export interface NotificationPayload {
  id: string;
  type: 'booking' | 'review' | 'dispute' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
}

export interface ConnectionInfo {
  id: string;
  userId: string;
  role: string;
  connectedAt: Date;
  lastActivity: Date;
}

// ============================================
// In-Process Event Store
// ============================================

class RealtimeEventStore {
  private connections = new Map<string, {
    userId: string;
    role: string;
    controller: ReadableStreamDefaultController;
    lastActivity: Date;
  }>();
  
  private userConnections = new Map<string, Set<string>>();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Register a new SSE connection
   */
  registerConnection(
    connectionId: string,
    userId: string,
    role: string,
    controller: ReadableStreamDefaultController
  ): void {
    // Store connection
    this.connections.set(connectionId, {
      userId,
      role,
      controller,
      lastActivity: new Date(),
    });

    // Track by user
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    console.log(`[Realtime] Connection registered: ${connectionId} (user: ${userId})`);
  }

  /**
   * Unregister an SSE connection
   */
  unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Remove from user tracking
      const userConnSet = this.userConnections.get(connection.userId);
      if (userConnSet) {
        userConnSet.delete(connectionId);
        if (userConnSet.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
      
      this.connections.delete(connectionId);
      console.log(`[Realtime] Connection unregistered: ${connectionId}`);
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Send event to specific user
   */
  emitToUser(userId: string, event: string, data: unknown): number {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds || connectionIds.size === 0) return 0;

    const realtimeEvent: RealtimeEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event,
      target: 'user',
      targetId: userId,
      data,
      timestamp: new Date(),
    };

    this.addToHistory(realtimeEvent);

    let sent = 0;
    connectionIds.forEach(connId => {
      const conn = this.connections.get(connId);
      if (conn) {
        try {
          conn.controller.enqueue(`data: ${JSON.stringify(realtimeEvent)}\n\n`);
          sent++;
        } catch (error) {
          console.error(`[Realtime] Failed to send to ${connId}:`, error);
        }
      }
    });

    return sent;
  }

  /**
   * Send event to all connections with a specific role
   */
  emitToRole(role: string, event: string, data: unknown): number {
    const realtimeEvent: RealtimeEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event,
      target: 'role',
      targetId: role,
      data,
      timestamp: new Date(),
    };

    this.addToHistory(realtimeEvent);

    let sent = 0;
    this.connections.forEach((conn, connId) => {
      if (conn.role === role) {
        try {
          conn.controller.enqueue(`data: ${JSON.stringify(realtimeEvent)}\n\n`);
          sent++;
        } catch (error) {
          console.error(`[Realtime] Failed to send to ${connId}:`, error);
        }
      }
    });

    return sent;
  }

  /**
   * Broadcast to all connections
   */
  broadcast(event: string, data: unknown): number {
    const realtimeEvent: RealtimeEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event,
      target: 'broadcast',
      targetId: 'all',
      data,
      timestamp: new Date(),
    };

    this.addToHistory(realtimeEvent);

    let sent = 0;
    this.connections.forEach((conn, connId) => {
      try {
        conn.controller.enqueue(`data: ${JSON.stringify(realtimeEvent)}\n\n`);
        sent++;
      } catch (error) {
        console.error(`[Realtime] Failed to broadcast to ${connId}:`, error);
      }
    });

    return sent;
  }

  /**
   * Get connection stats
   */
  getStats(): { totalConnections: number; uniqueUsers: number; users: string[] } {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      users: Array.from(this.userConnections.keys()),
    };
  }

  /**
   * Get recent events for reconnection
   */
  getRecentEvents(since: Date): RealtimeEvent[] {
    return this.eventHistory.filter(e => e.timestamp > since);
  }

  /**
   * Add event to history
   */
  private addToHistory(event: RealtimeEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Clean up stale connections (older than 5 minutes without activity)
   */
  cleanupStaleConnections(): number {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let cleaned = 0;

    this.connections.forEach((conn, connId) => {
      if (conn.lastActivity < fiveMinutesAgo) {
        try {
          conn.controller.close();
        } catch {
          // Already closed
        }
        this.unregisterConnection(connId);
        cleaned++;
      }
    });

    return cleaned;
  }
}

// ============================================
// Singleton Instance
// ============================================

export const realtimeStore = new RealtimeEventStore();

// Cleanup interval (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = realtimeStore.cleanupStaleConnections();
    if (cleaned > 0) {
      console.log(`[Realtime] Cleaned ${cleaned} stale connections`);
    }
  }, 5 * 60 * 1000);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Emit event to specific user
 */
export async function emitToUser(userId: string, event: string, data: unknown): Promise<boolean> {
  const sent = realtimeStore.emitToUser(userId, event, data);
  return sent > 0;
}

/**
 * Emit event to users with specific role
 */
export async function emitToRole(role: string, event: string, data: unknown): Promise<boolean> {
  const sent = realtimeStore.emitToRole(role, event, data);
  return sent > 0;
}

/**
 * Broadcast event to all users
 */
export async function broadcastEvent(event: string, data: unknown): Promise<boolean> {
  const sent = realtimeStore.broadcast(event, data);
  return sent > 0;
}

/**
 * Send notification to user
 */
export async function sendNotification(
  userId: string,
  notification: Omit<NotificationPayload, 'id' | 'createdAt' | 'read'>
): Promise<boolean> {
  const fullNotification: NotificationPayload = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    read: false,
  };

  return emitToUser(userId, 'notification.new', fullNotification);
}

/**
 * Get realtime stats
 */
export function getRealtimeStats() {
  return realtimeStore.getStats();
}

// ============================================
// Compatibility Layer (for socket-bridge)
// ============================================

/**
 * Emit to booking room (users watching a booking)
 */
export async function emitToBooking(bookingId: string, event: string, data: unknown): Promise<boolean> {
  // For now, this broadcasts to all connections
  // In future, implement room-based subscriptions
  const realtimeEvent: RealtimeEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: event,
    target: 'booking',
    targetId: bookingId,
    data,
    timestamp: new Date(),
  };

  // Broadcast with booking context
  return emitToUser('*', `booking:${bookingId}:${event}`, realtimeEvent);
}

/**
 * Emit to dispute room
 */
export async function emitToDispute(disputeId: string, event: string, data: unknown): Promise<boolean> {
  const realtimeEvent: RealtimeEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: event,
    target: 'dispute',
    targetId: disputeId,
    data,
    timestamp: new Date(),
  };

  return emitToUser('*', `dispute:${disputeId}:${event}`, realtimeEvent);
}
