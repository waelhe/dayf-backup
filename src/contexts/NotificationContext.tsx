/**
 * Notification Context - Real-time Notifications
 * سياق الإشعارات للاتصال في الوقت الحقيقي
 * 
 * Features:
 * - Real-time notifications via Socket.io
 * - Push notifications via OneSignal
 * - Notification bell UI
 * - Unread count badge
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useUser } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface Notification {
  id: string;
  type: 'booking' | 'review' | 'dispute' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isOneSignalReady: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  requestPushPermission: () => Promise<boolean>;
}

// ============================================
// Context
// ============================================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================

export function NotificationProvider({ 
  children,
}: { 
  children: React.ReactNode;
}) {
  const { userId } = useUser();
  
  const { 
    isConnected, 
    notifications, 
    unreadCount, 
    markNotificationRead,
    clearNotifications,
    on,
  } = useSocket({ userId: userId ?? undefined });

  // ============================================
  // OneSignal Integration
  // ============================================

  // Check if OneSignal is available (using lazy initialization)
  const [isOneSignalReady, setIsOneSignalReady] = useState(() => {
    // Check on initial render
    if (typeof window !== 'undefined' && 'OneSignal' in window) {
      return true;
    }
    return false;
  });

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined' || !('OneSignal' in window)) {
        logger.warn('OneSignal not available');
        return false;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        logger.info('Push notification permission granted');
        return true;
      }
      
      logger.warn('Push notification permission denied');
      return false;
    } catch (error) {
      logger.error('Error requesting push permission', { error });
      return false;
    }
  }, []);

  // ============================================
  // Listen for real-time events
  // ============================================

  useEffect(() => {
    if (!isConnected) return;

    // Booking events
    on('booking.created', (data) => {
      logger.info('Booking created notification', { data });
    });

    on('booking.confirmed', (data) => {
      logger.info('Booking confirmed notification', { data });
    });

    on('booking.completed', (data) => {
      logger.info('Booking completed notification', { data });
    });

    // Escrow events
    on('escrow.released', (data) => {
      logger.info('Escrow released notification', { data });
    });

    // Review events
    on('review.created', (data) => {
      logger.info('Review created notification', { data });
    });

    // Dispute events
    on('dispute.resolved', (data) => {
      logger.info('Dispute resolved notification', { data });
    });

    // System alerts
    on('system.alert', (data) => {
      logger.info('System alert received', { data });
    });
  }, [isConnected, on]);

  // ============================================
  // Actions
  // ============================================

  const markAsRead = useCallback((id: string) => {
    markNotificationRead(id);
  }, [markNotificationRead]);

  const markAllAsRead = useCallback(() => {
    notifications.forEach(n => {
      if (!n.read) {
        markNotificationRead(n.id);
      }
    });
  }, [notifications, markNotificationRead]);

  const clearAll = useCallback(() => {
    clearNotifications();
  }, [clearNotifications]);

  // ============================================
  // Context Value
  // ============================================

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    isOneSignalReady,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestPushPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// ============================================
// Notification Bell Component
// ============================================

export function NotificationBell() {
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return d.toLocaleDateString('ar-SA');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅';
      case 'review': return '⭐';
      case 'dispute': return '⚠️';
      case 'system': return '🔔';
      case 'promotion': return '🎁';
      default: return '📌';
    }
  };

  return (
    <div className="relative" dir="rtl">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="الإشعارات"
      >
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Connection Status */}
        {!isConnected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-gray-400 rounded-full" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 left-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">الإشعارات</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  تحديد الكل كمقروء
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl block mb-2">🔔</span>
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </p>
                        <p className="text-gray-600 text-sm mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-sm text-gray-600 hover:text-gray-800"
                >
                  عرض كل الإشعارات
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationProvider;
