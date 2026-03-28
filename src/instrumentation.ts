/**
 * Next.js Instrumentation - Application Startup
 * تهيئة التطبيق عند البدء
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة V: تفعيل نظام الأحداث
 * - المادة VI: تفعيل Rate Limiting
 * 
 * This file runs when the Next.js server starts.
 * It initializes all infrastructure components.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Startup] Initializing Dayf Platform...');
    
    // ============================================
    // 1. Setup Event Listeners
    // ============================================
    const { setupEventListeners } = await import('@/infrastructure/events');
    setupEventListeners();
    console.log('[Startup] ✅ Event listeners initialized');
    
    // ============================================
    // 2. Check Redis Availability
    // ============================================
    const { isRedisAvailable } = await import('@/infrastructure/redis');
    const redisAvailable = isRedisAvailable();
    console.log(`[Startup] ${redisAvailable ? '✅' : '⚠️'} Redis ${redisAvailable ? 'connected' : 'not available (using in-memory)'}`);
    
    // ============================================
    // 3. Check BullMQ Availability
    // ============================================
    const { isBullMQAvailable } = await import('@/infrastructure/queue');
    const bullMQAvailable = isBullMQAvailable();
    console.log(`[Startup] ${bullMQAvailable ? '✅' : '⚠️'} BullMQ ${bullMQAvailable ? 'connected' : 'not available (using sync processing)'}`);
    
    // ============================================
    // 4. Check OneSignal Availability
    // ============================================
    const { isOneSignalAvailable } = await import('@/infrastructure/notifications');
    const oneSignalAvailable = isOneSignalAvailable();
    console.log(`[Startup] ${oneSignalAvailable ? '✅' : '⚠️'} OneSignal ${oneSignalAvailable ? 'configured' : 'not configured'}`);
    
    // ============================================
    // 5. Check Resend Availability
    // ============================================
    const { isResendAvailable } = await import('@/infrastructure/email');
    const resendAvailable = isResendAvailable();
    console.log(`[Startup] ${resendAvailable ? '✅' : '⚠️'} Resend ${resendAvailable ? 'configured' : 'not configured'}`);
    
    // ============================================
    // 6. Enable Event Bus Debug Mode in Development
    // ============================================
    if (process.env.NODE_ENV === 'development') {
      const { setDebugMode } = await import('@/infrastructure/events/event-bus');
      setDebugMode(true);
      console.log('[Startup] ✅ Event bus debug mode enabled');
    }
    
    console.log('[Startup] 🚀 Dayf Platform ready!');
  }
}
