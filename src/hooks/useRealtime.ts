/**
 * useRealtime Hook - SSE-based Real-time Events
 * Hook للأحداث في الوقت الحقيقي باستخدام SSE
 * 
 * الحل الجذري:
 * - SSE يعمل على جميع الاستضافات
 * - لا يحتاج WebSocket
 * - اتصال مستقر عبر HTTP
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface RealtimeEvent {
  id: string;
  type: string;
  target: 'user' | 'role' | 'booking' | 'dispute' | 'broadcast';
  targetId: string;
  data: unknown;
  timestamp: Date;
}

interface Notification {
  id: string;
  type: 'booking' | 'review' | 'dispute' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
}

interface UseRealtimeOptions {
  userId?: string;
  role?: string;
  autoConnect?: boolean;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  connectionId: string | null;
  notifications: Notification[];
  unreadCount: number;
  lastEvent: RealtimeEvent | null;
  disconnect: () => void;
  reconnect: () => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const { userId = 'anonymous', role = 'guest', autoConnect = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const userIdRef = useRef(userId);
  const roleRef = useRef(role);
  const maxReconnectAttempts = 10;

  // Keep refs updated
  useEffect(() => {
    userIdRef.current = userId;
    roleRef.current = role;
  }, [userId, role]);

  // ============================================
  // Connection Management
  // ============================================

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
    setConnectionId(null);
    logger.info('[Realtime] Disconnected');
  };

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL('/api/realtime/stream', window.location.origin);
    url.searchParams.set('userId', userIdRef.current);
    url.searchParams.set('role', roleRef.current);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      logger.info('[Realtime] Connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const realtimeEvent = JSON.parse(event.data) as RealtimeEvent;
        realtimeEvent.timestamp = new Date(realtimeEvent.timestamp);
        
        setLastEvent(realtimeEvent);

        // Handle connection established
        if (realtimeEvent.type === 'connection.established') {
          const data = realtimeEvent.data as { connectionId: string };
          setConnectionId(data.connectionId);
          logger.info('[Realtime] Connection established:', data.connectionId);
          return;
        }

        // Handle notifications
        if (realtimeEvent.type === 'notification.new') {
          const notification = realtimeEvent.data as Notification;
          notification.createdAt = new Date(notification.createdAt);
          setNotifications(prev => [notification, ...prev]);

          // Show browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/logo.png',
            });
          }
        }
      } catch (error) {
        logger.error('[Realtime] Failed to parse event:', error);
      }
    };

    eventSource.onerror = () => {
      logger.error('[Realtime] Connection error');
      setIsConnected(false);
      setConnectionId(null);
      eventSource.close();

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          logger.info(`[Realtime] Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
          connect();
        }, delay);
      }
    };
  };

  const reconnect = () => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  };

  // ============================================
  // Auto-connect on mount
  // ============================================

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // ============================================
  // Computed Values
  // ============================================

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    isConnected,
    connectionId,
    notifications,
    unreadCount,
    lastEvent,
    disconnect,
    reconnect,
  };
}

// ============================================
// Booking Events Hook
// ============================================

export function useBookingRealtime(bookingId: string) {
  const { isConnected, lastEvent } = useRealtime();
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !bookingId || !lastEvent) return;

    // Check if event is for this booking
    if (lastEvent.target === 'booking' && lastEvent.targetId === bookingId) {
      // Use flushSync or queueMicrotask to avoid cascading renders
      queueMicrotask(() => {
        setBookingStatus(lastEvent.type);
      });
    }
  }, [isConnected, bookingId, lastEvent]);

  return {
    isConnected,
    bookingStatus,
    lastEvent,
  };
}

// ============================================
// Dispute Events Hook
// ============================================

export function useDisputeRealtime(disputeId: string) {
  const { isConnected, lastEvent } = useRealtime();

  useEffect(() => {
    if (!isConnected || !disputeId || !lastEvent) return;

    // Check if event is for this dispute
    if (lastEvent.target === 'dispute' && lastEvent.targetId === disputeId) {
      // Handle dispute events
    }
  }, [isConnected, disputeId, lastEvent]);

  return {
    isConnected,
    lastEvent,
  };
}

// ============================================
// Exports
// ============================================

export default useRealtime;
