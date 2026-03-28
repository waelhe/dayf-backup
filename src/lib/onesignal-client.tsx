/**
 * OneSignal SDK Integration for Frontend
 * تكامل OneSignal SDK للفرونت إند
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة VI: إشعارات للمستخدمين
 * - دعم Web Push Notifications
 * 
 * Usage:
 * 1. Add OneSignal SDK script to layout.tsx
 * 2. Use useOneSignal hook to initialize and manage notifications
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface OneSignalNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface OneSignalUser {
  userId: string;
  pushToken: string | null;
  subscribed: boolean;
}

interface OneSignalWindow extends Window {
  OneSignal?: {
    init: (options: OneSignalInitOptions) => Promise<void>;
    getUserId: () => Promise<string | undefined>;
    getSubscription: () => Promise<boolean>;
    setSubscription: (subscribed: boolean) => Promise<void>;
    sendTag: (key: string, value: string) => Promise<void>;
    sendTags: (tags: Record<string, string>) => Promise<void>;
    getTags: () => Promise<Record<string, string>>;
    deleteTag: (key: string) => Promise<void>;
    deleteTags: (keys: string[]) => Promise<void>;
    addListenerForNotificationOpened: (callback: (data: OneSignalNotification) => void) => void;
    setNotificationOpenedHandler: (handler: (data: OneSignalNotification) => void) => void;
    setNotificationWillShowInForegroundHandler: (handler: (data: OneSignalNotification) => OneSignalNotification | null) => void;
    showSlidedownPrompt: (options?: { force?: boolean }) => Promise<void>;
    showNativePrompt: () => Promise<void>;
    registerForPushNotifications: () => Promise<void>;
    isPushNotificationsEnabled: () => Promise<boolean>;
    isPushNotificationsSupported: () => boolean;
  };
}

interface OneSignalInitOptions {
  appId: string;
  allowLocalhostAsSecureOrigin?: boolean;
  autoRegister?: boolean;
  autoResubscribe?: boolean;
  notifyButton?: {
    enable: boolean;
    size?: 'small' | 'medium' | 'large';
    position?: 'bottom-left' | 'bottom-right';
    theme?: 'default' | 'inverse';
    showCredit?: boolean;
    text?: {
      'tip.state.unsubscribed'?: string;
      'tip.state.subscribed'?: string;
      'tip.state.blocked'?: string;
      'message.prenotify'?: string;
      'message.action.subscribed'?: string;
      'message.action.resubscribed'?: string;
      'message.action.unsubscribed'?: string;
      'dialog.main.title'?: string;
      'dialog.main.button.subscribe'?: string;
      'dialog.main.button.unsubscribe'?: string;
      'dialog.blocked.title'?: string;
      'dialog.blocked.message'?: string;
    };
  };
  promptOptions?: {
    actionMessage?: string;
    acceptButtonText?: string;
    cancelButtonText?: string;
    exampleNotificationTitleDesktop?: string;
    exampleNotificationMessageDesktop?: string;
    exampleNotificationTitleMobile?: string;
    exampleNotificationMessageMobile?: string;
    exampleNotificationCaption?: string;
    acceptButton?: string;
    cancelButton?: string;
  };
  welcomeNotification?: {
    title?: string;
    message?: string;
    url?: string;
  };
}

// ============================================
// Configuration
// ============================================

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '';

// ============================================
// Hook Implementation
// ============================================

export function useOneSignal(userId?: string) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get OneSignal instance
  const getOneSignal = useCallback((): OneSignalWindow['OneSignal'] | undefined => {
    if (typeof window === 'undefined') return undefined;
    return (window as OneSignalWindow).OneSignal;
  }, []);

  // Initialize OneSignal
  const initialize = useCallback(async () => {
    if (!ONESIGNAL_APP_ID) {
      logger.warn('[OneSignal] App ID not configured');
      return;
    }

    const OneSignal = getOneSignal();
    if (!OneSignal) {
      logger.warn('[OneSignal] SDK not loaded');
      return;
    }

    if (isInitialized) {
      logger.info('[OneSignal] Already initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        autoRegister: false,
        autoResubscribe: true,
        notifyButton: {
          enable: false, // We use custom UI
        },
        promptOptions: {
          actionMessage: 'سنرسل لك إشعارات حول حجوزاتك ورسائلك',
          acceptButtonText: 'سماح',
          cancelButtonText: 'لا، شكراً',
          exampleNotificationTitleDesktop: 'منصة ضيف',
          exampleNotificationMessageDesktop: 'تم تأكيد حجزك!',
          exampleNotificationTitleMobile: 'منصة ضيف',
          exampleNotificationMessageMobile: 'تم تأكيد حجزك!',
        },
        welcomeNotification: {
          title: 'مرحباً بك في ضيف!',
          message: 'شكراً لاشتراكك في الإشعارات',
        },
      });

      // Set external user ID if provided
      if (userId) {
        const existingId = await OneSignal.getUserId();
        if (existingId) {
          setDeviceId(existingId);
          
          // Tag with user info
          await OneSignal.sendTag('user_id', userId);
        }
      }

      // Check subscription status
      const subscribed = await OneSignal.getSubscription();
      setIsSubscribed(subscribed);

      // Set up notification handlers
      OneSignal.setNotificationOpenedHandler((notification) => {
        logger.info('[OneSignal] Notification opened:', { notification });
        
        // Handle notification click (navigate to URL)
        if (notification.url) {
          window.location.href = notification.url;
        }
      });

      OneSignal.setNotificationWillShowInForegroundHandler((notification) => {
        logger.info('[OneSignal] Notification in foreground:', { notification });
        return notification; // Show the notification
      });

      setIsInitialized(true);
      logger.info('[OneSignal] Initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[OneSignal] Initialization failed:', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, getOneSignal, isInitialized]);

  // Initialize on mount
  useEffect(() => {
    // Wait for OneSignal SDK to load
    const checkAndInit = () => {
      const OneSignal = getOneSignal();
      if (OneSignal) {
        initialize();
      } else {
        // Retry after a short delay
        setTimeout(checkAndInit, 500);
      }
    };

    // Start checking after a short delay
    const timeout = setTimeout(checkAndInit, 1000);

    return () => clearTimeout(timeout);
  }, [initialize, getOneSignal]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const OneSignal = getOneSignal();
    if (!OneSignal || !isInitialized) {
      logger.warn('[OneSignal] Not initialized');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Show native prompt
      await OneSignal.showNativePrompt();
      
      // Check if now subscribed
      const subscribed = await OneSignal.getSubscription();
      setIsSubscribed(subscribed);
      
      if (subscribed) {
        const id = await OneSignal.getUserId();
        setDeviceId(id || null);
      }
      
      return subscribed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[OneSignal] Permission request failed:', { error: errorMessage });
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getOneSignal, isInitialized]);

  // Subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    const OneSignal = getOneSignal();
    if (!OneSignal || !isInitialized) return false;

    try {
      await OneSignal.setSubscription(true);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      logger.error('[OneSignal] Subscribe failed:', { error: err });
      return false;
    }
  }, [getOneSignal, isInitialized]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    const OneSignal = getOneSignal();
    if (!OneSignal || !isInitialized) return false;

    try {
      await OneSignal.setSubscription(false);
      setIsSubscribed(false);
      return true;
    } catch (err) {
      logger.error('[OneSignal] Unsubscribe failed:', { error: err });
      return false;
    }
  }, [getOneSignal, isInitialized]);

  // Send tags
  const sendTags = useCallback(async (tags: Record<string, string>): Promise<boolean> => {
    const OneSignal = getOneSignal();
    if (!OneSignal || !isInitialized) return false;

    try {
      await OneSignal.sendTags(tags);
      return true;
    } catch (err) {
      logger.error('[OneSignal] Send tags failed:', { error: err });
      return false;
    }
  }, [getOneSignal, isInitialized]);

  // Check if push is supported
  const isSupported = useCallback(() => {
    const OneSignal = getOneSignal();
    return OneSignal?.isPushNotificationsSupported() ?? false;
  }, [getOneSignal]);

  return {
    isInitialized,
    isSubscribed,
    deviceId,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTags,
    isSupported,
  };
}

// ============================================
// OneSignal Provider Component
// ============================================

export function OneSignalProvider({ 
  children,
  userId,
}: { 
  children: React.ReactNode;
  userId?: string;
}) {
  useOneSignal(userId);
  
  return <>{children}</>;
}

// ============================================
// OneSignal Script Component
// ============================================

export function OneSignalScript() {
  if (!ONESIGNAL_APP_ID) {
    return null;
  }

  return (
    <script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      async
      defer
    />
  );
}

export default useOneSignal;
