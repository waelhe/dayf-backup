/**
 * useSocket Hook - Socket.io Client for Frontend
 * Hook للاتصال بـ Socket.io من Frontend
 * 
 * Features:
 * - Auto-reconnection
 * - Event subscription management
 * - User authentication
 * - Room management
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface SocketEvent {
  timestamp: Date;
  data: unknown;
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

interface UseSocketOptions {
  userId?: string;
  role?: string;
  autoConnect?: boolean;
}

interface UseSocketReturn {
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  subscribe: (events: string[]) => void;
  unsubscribe: (events: string[]) => void;
  joinBooking: (bookingId: string) => void;
  joinDispute: (disputeId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  off: (event: string) => void;
}

// ============================================
// Socket Instance (Singleton)
// ============================================

let socketInstance: Socket | null = null;

function getSocketInstance(): Socket | null {
  return socketInstance;
}

/**
 * Get socket connection configuration
 * يعيد إعدادات الاتصال المناسبة للبيئة
 * 
 * الحل: استخدام XTransformPort للـ Gateway
 */
function getSocketConfig(userId?: string, role?: string): { url: string; options: Record<string, unknown> } {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Use XTransformPort query parameter for gateway routing
  // استخدم XTransformPort للتوجيه عبر البوابة
  const options: Record<string, unknown> = {
    transports: ['websocket', 'polling'],
    auth: {
      userId,
      role,
    },
    query: {
      XTransformPort: '3003', // Route to socket service via gateway
      userId,
      role,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    path: '/', // Use root path - gateway handles routing via XTransformPort
  };

  return { url: origin, options };
}

function createSocketInstance(userId?: string, role?: string): Socket {
  const { url, options } = getSocketConfig(userId, role);
  
  const socket = io(url, options as Parameters<typeof io>[1]);

  return socket;
}

// ============================================
// Hook Implementation
// ============================================

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { userId, role = 'guest', autoConnect = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const eventHandlersRef = useRef<Map<string, (data: unknown) => void>>(new Map());

  // ============================================
  // Connection Management
  // ============================================

  useEffect(() => {
    if (!autoConnect) return;

    // Create or reuse socket instance
    if (!socketInstance) {
      socketInstance = createSocketInstance(userId, role);
    }
    socketRef.current = socketInstance;

    const socket = socketRef.current;

    // Connection handlers
    socket.on('connect', () => {
      setIsConnected(true);
      logger.info('[Socket] Connected successfully');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      logger.warn('[Socket] Disconnected:', { reason });
    });

    socket.on('connect_error', (error) => {
      logger.error('[Socket] Connection error:', { message: error.message });
    });

    // Re-attach existing event handlers
    eventHandlersRef.current.forEach((handler, event) => {
      socket.on(event, handler);
    });

    return () => {
      // Don't disconnect on unmount - keep connection for other components
      // Just remove listeners
      eventHandlersRef.current.forEach((handler, event) => {
        socket.off(event, handler);
      });
    };
  }, [userId, role, autoConnect]);

  // ============================================
  // Notification Management
  // ============================================

  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Listen for new notifications
    socket.on('notification.new', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
        });
      }
    });

    // Listen for notification read
    socket.on('notification.read', ({ notificationId }: { notificationId: string }) => {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    });

    return () => {
      socket.off('notification.new');
      socket.off('notification.read');
    };
  }, []);

  // ============================================
  // Event Subscription
  // ============================================

  const subscribe = useCallback((events: string[]) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('subscribe:events', events);
  }, []);

  const unsubscribe = useCallback((events: string[]) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('unsubscribe:events', events);
  }, []);

  // ============================================
  // Room Management
  // ============================================

  const joinBooking = useCallback((bookingId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('join:booking', bookingId);
  }, []);

  const joinDispute = useCallback((disputeId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('join:dispute', disputeId);
  }, []);

  // ============================================
  // Notification Actions
  // ============================================

  const markNotificationRead = useCallback((notificationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('notification:read', notificationId);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // ============================================
  // Custom Event Handlers
  // ============================================

  const on = useCallback((event: string, handler: (data: unknown) => void) => {
    eventHandlersRef.current.set(event, handler);
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event: string) => {
    eventHandlersRef.current.delete(event);
    if (socketRef.current) {
      socketRef.current.off(event);
    }
  }, []);

  // ============================================
  // Computed Values
  // ============================================

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    isConnected,
    notifications,
    unreadCount,
    subscribe,
    unsubscribe,
    joinBooking,
    joinDispute,
    markNotificationRead,
    clearNotifications,
    on,
    off,
  };
}

// ============================================
// Booking Events Hook
// ============================================

export function useBookingEvents(bookingId: string) {
  const { isConnected, on, off, joinBooking } = useSocket();
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<{ event: string; data: unknown } | null>(null);

  useEffect(() => {
    if (!isConnected || !bookingId) return;

    joinBooking(bookingId);

    // Listen for booking events
    const handleBookingEvent = (data: unknown) => {
      setLastEvent({ event: 'booking', data });
    };

    on('booking.confirmed', handleBookingEvent);
    on('booking.cancelled', handleBookingEvent);
    on('booking.completed', handleBookingEvent);

    return () => {
      off('booking.confirmed');
      off('booking.cancelled');
      off('booking.completed');
    };
  }, [isConnected, bookingId, joinBooking, on, off]);

  return {
    isConnected,
    bookingStatus,
    lastEvent,
  };
}

// ============================================
// Dispute Events Hook
// ============================================

export function useDisputeEvents(disputeId: string) {
  const { isConnected, on, off, joinDispute } = useSocket();
  const [lastEvent, setLastEvent] = useState<{ event: string; data: unknown } | null>(null);

  useEffect(() => {
    if (!isConnected || !disputeId) return;

    joinDispute(disputeId);

    const handleDisputeEvent = (data: unknown) => {
      setLastEvent({ event: 'dispute', data });
    };

    on('dispute.message_added', handleDisputeEvent);
    on('dispute.resolved', handleDisputeEvent);

    return () => {
      off('dispute.message_added');
      off('dispute.resolved');
    };
  }, [isConnected, disputeId, joinDispute, on, off]);

  return {
    isConnected,
    lastEvent,
  };
}

// ============================================
// Exports
// ============================================

export default useSocket;
