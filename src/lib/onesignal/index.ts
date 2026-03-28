/**
 * OneSignal Integration - Push Notifications
 * تكامل OneSignal للإشعارات الفورية
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة VI: الأمان بالافتراض
 * - إذن المستخدم مطلوب قبل الإشعارات
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface OneSignalState {
  isReady: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  playerId: string | null;
}

// ============================================
// Configuration
// ============================================

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '';

// ============================================
// OneSignal Helper Functions
// ============================================

/**
 * Initialize OneSignal
 */
export async function initOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if OneSignal is already loaded
  if ('OneSignal' in window) {
    return true;
  }

  // Check if we have the app ID
  if (!ONESIGNAL_APP_ID) {
    logger.warn('OneSignal App ID not configured');
    return false;
  }

  try {
    // Load OneSignal SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    document.head.appendChild(script);

    // Wait for SDK to load
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
    });

    // Initialize OneSignal
    const OneSignalWindow = window as unknown as { 
      OneSignal?: { 
        init: (config: Record<string, unknown>) => Promise<void> 
      } 
    };
    
    if (OneSignalWindow.OneSignal) {
      await OneSignalWindow.OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        welcomeNotification: {
          title: 'ضيف',
          message: 'شكراً لاشتراكك في الإشعارات!',
        },
      });
    }

    logger.info('OneSignal initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize OneSignal', { error });
    return false;
  }
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      logger.warn('Notifications not supported');
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
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const OneSignalWindow = window as unknown as { 
      OneSignal?: { 
        setExternalUserId: (id: string) => Promise<void>,
        registerForPushNotifications: () => Promise<void>
      } 
    };

    if (!OneSignalWindow.OneSignal) {
      logger.warn('OneSignal not available');
      return false;
    }

    // Set external user ID
    await OneSignalWindow.OneSignal.setExternalUserId(userId);

    // Register for push notifications
    await OneSignalWindow.OneSignal.registerForPushNotifications();

    logger.info('User subscribed to push notifications', { userId });
    return true;
  } catch (error) {
    logger.error('Error subscribing to push notifications', { error });
    return false;
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const OneSignalWindow = window as unknown as { 
      OneSignal?: { removeExternalUserId: () => Promise<void> } 
    };

    if (!OneSignalWindow.OneSignal) {
      return false;
    }

    await OneSignalWindow.OneSignal.removeExternalUserId();

    logger.info('User unsubscribed from push notifications');
    return true;
  } catch (error) {
    logger.error('Error unsubscribing from push notifications', { error });
    return false;
  }
}

/**
 * Get current push subscription status
 */
export async function getPushSubscriptionStatus(): Promise<OneSignalState> {
  const defaultState: OneSignalState = {
    isReady: false,
    isSubscribed: false,
    permission: 'default',
    playerId: null,
  };

  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const permission = Notification.permission;

    const OneSignalWindow = window as unknown as { 
      OneSignal?: { 
        isPushNotificationsEnabled: () => Promise<boolean>,
        getPlayerId: () => Promise<string | null>
      } 
    };

    if (!OneSignalWindow.OneSignal) {
      return { ...defaultState, permission };
    }

    const isSubscribed = await OneSignalWindow.OneSignal.isPushNotificationsEnabled();
    const playerId = await OneSignalWindow.OneSignal.getPlayerId();

    return {
      isReady: true,
      isSubscribed,
      permission,
      playerId,
    };
  } catch (error) {
    logger.error('Error getting push subscription status', { error });
    return defaultState;
  }
}

/**
 * Send tags to OneSignal for user segmentation
 */
export async function setOneSignalTags(tags: Record<string, string>): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const OneSignalWindow = window as unknown as { 
      OneSignal?: { sendTags: (tags: Record<string, string>) => Promise<void> } 
    };

    if (!OneSignalWindow.OneSignal) {
      return;
    }

    await OneSignalWindow.OneSignal.sendTags(tags);
    logger.info('OneSignal tags set', { tags: Object.keys(tags) });
  } catch (error) {
    logger.error('Error setting OneSignal tags', { error });
  }
}

// ============================================
// React Hook
// ============================================

export function useOneSignal(userId?: string) {
  const [state, setState] = useState<OneSignalState>({
    isReady: false,
    isSubscribed: false,
    permission: 'default',
    playerId: null,
  });

  // Initialize OneSignal
  useEffect(() => {
    initOneSignal().then(async (success) => {
      if (success) {
        const status = await getPushSubscriptionStatus();
        setState(status);
      }
    });
  }, []);

  // Subscribe user when userId is available
  useEffect(() => {
    if (userId && state.isReady && state.permission === 'granted' && !state.isSubscribed) {
      subscribeToPush(userId).then(() => {
        setState(prev => ({ ...prev, isSubscribed: true }));
      });
    }
  }, [userId, state.isReady, state.permission, state.isSubscribed]);

  const subscribe = useCallback(async () => {
    const granted = await requestPushPermission();
    if (granted && userId) {
      await subscribeToPush(userId);
      const status = await getPushSubscriptionStatus();
      setState(status);
    }
    return granted;
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    await unsubscribeFromPush();
    setState(prev => ({ ...prev, isSubscribed: false }));
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    setTags: setOneSignalTags,
  };
}

export default useOneSignal;
