/**
 * Event Bus - Unified Export
 * ناقل الأحداث الموحد
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة V: الاستقلالية بين الوحدات عبر الأحداث فقط
 * 
 * هذا الملف يوحد eventBus من infrastructure/events
 * ليكون المصدر الوحيد للأحداث في التطبيق
 */

// Re-export from infrastructure/events (EventEmitter2)
export {
  publish,
  subscribe,
  once,
  subscribeWildcard,
  unsubscribeAll,
  getListenerCount,
  safeHandler,
  publishAsync,
  setDebugMode,
  getEventLog,
  clearEventLog,
  EVENTS,
  eventBus,
  EventEmitter2,
  type EventPayload,
  type EventLog,
  type EventHandler,
} from '@/infrastructure/events';

// Re-export event listeners setup
export { setupEventListeners, teardownEventListeners } from '@/infrastructure/events';
