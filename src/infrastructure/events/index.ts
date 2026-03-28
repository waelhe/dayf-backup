/**
 * Events Infrastructure
 * البنية التحتية للأحداث
 *
 * 🏛️ Constitutional Compliance:
 * - المادة V: الاستقلالية بين الوحدات عبر الأحداث فقط
 * - Wildcard support
 * - Distributed via BullMQ
 * - Real-time via Socket.io
 */

// Event Bus - Named exports
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
  EventEmitter2,
  type EventPayload,
  type EventLog,
  type EventHandler,
} from './event-bus';

// Re-export default as named export
export { default as eventBus } from './event-bus';

// ============================================
// Event Listeners Setup
// ============================================

import { subscribe, EVENTS } from './event-bus';
import {
  sendPushNotification,
  notifyBookingConfirmed,
  notifyEscrowReleased,
  notifyReviewRequest,
} from '../notifications';
import {
  queueEmail,
  queueNotification,
} from '../queue';
import {
  emitToUser,
  emitToBooking,
  emitToDispute,
  sendNotification as sendSocketNotification,
} from '@/lib/realtime';

/**
 * Setup all event listeners
 * إعداد جميع مستمعي الأحداث
 * 
 * This connects:
 * - EventEmitter2 (Backend) → Socket.io (Frontend)
 * - EventEmitter2 (Backend) → BullMQ (Background Jobs)
 * - EventEmitter2 (Backend) → OneSignal (Push Notifications)
 */
export function setupEventListeners(): void {
  console.log('[EventBus] Setting up event listeners...');

  // ============================================
  // Booking Events
  // ============================================

  // Booking created → Create Escrow (handled in service)
  subscribe(EVENTS.BOOKING_CREATED, async (data) => {
    console.log('[EventBus] Booking created:', data);
    
    const payload = data as {
      bookingId: string;
      guestId: string;
      hostId: string;
    };
    
    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.guestId, 'booking.created', data);
    await emitToUser(payload.hostId, 'booking.created', data);
  });

  // Booking confirmed → Send notification
  subscribe(EVENTS.BOOKING_CONFIRMED, async (data) => {
    console.log('[EventBus] Booking confirmed:', data);
    
    const payload = data as {
      bookingId: string;
      guestId: string;
      hostId: string;
      serviceName: string;
    };
    
    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.guestId, 'booking.confirmed', data);
    await emitToBooking(payload.bookingId, 'booking.confirmed', data);
    
    // Send push notification
    await queueNotification(
      payload.guestId,
      'تم تأكيد الحجز ✅',
      'تم تأكيد حجزك بنجاح'
    );
    
    // Send Socket.io notification
    await sendSocketNotification(payload.guestId, {
      type: 'booking',
      title: 'تم تأكيد الحجز ✅',
      message: `تم تأكيد حجزك في ${payload.serviceName || 'الخدمة'}`,
      data: { bookingId: payload.bookingId },
    });
  });

  // Booking completed → Request review
  subscribe(EVENTS.BOOKING_COMPLETED, async (data) => {
    console.log('[EventBus] Booking completed:', data);
    
    const payload = data as {
      bookingId: string;
      guestId: string;
      hostId: string;
      serviceId: string;
      totalPrice: number;
      serviceName?: string;
    };

    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.guestId, 'booking.completed', data);
    await emitToUser(payload.hostId, 'booking.completed', data);
    await emitToBooking(payload.bookingId, 'booking.completed', data);

    // Request review from guest
    await queueNotification(
      payload.guestId,
      'شاركنا رأيك ⭐',
      'كيف كانت تجربتك؟ شاركنا مراجعتك'
    );

    // Notify host of completion
    await queueNotification(
      payload.hostId,
      'اكتمل الحجز ✅',
      'تم إكمال الحجز بنجاح'
    );
    
    // Send Socket.io notification for review request
    await sendSocketNotification(payload.guestId, {
      type: 'review',
      title: 'شاركنا رأيك ⭐',
      message: `كيف كانت تجربتك في ${payload.serviceName || 'الخدمة'}؟ شاركنا مراجعتك`,
      data: { bookingId: payload.bookingId, serviceId: payload.serviceId },
    });
  });

  // Booking cancelled → Refund Escrow
  subscribe(EVENTS.BOOKING_CANCELLED, async (data) => {
    console.log('[EventBus] Booking cancelled:', data);
    
    const payload = data as {
      bookingId: string;
      guestId: string;
      hostId: string;
    };
    
    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.guestId, 'booking.cancelled', data);
    await emitToUser(payload.hostId, 'booking.cancelled', data);
    await emitToBooking(payload.bookingId, 'booking.cancelled', data);
  });

  // ============================================
  // Escrow Events
  // ============================================

  // Escrow funded → Notify provider
  subscribe(EVENTS.ESCROW_FUNDED, async (data) => {
    console.log('[EventBus] Escrow funded:', data);
    
    const payload = data as {
      escrowId: string;
      buyerId: string;
      providerId: string;
      amount: number;
    };

    // Emit to Socket.io
    await emitToUser(payload.providerId, 'escrow.funded', data);

    await queueNotification(
      payload.providerId,
      'تم استلام الدفعة 💰',
      `تم استلام ${payload.amount} في حساب الضمان`
    );
  });

  // Escrow released → Notify both parties
  subscribe(EVENTS.ESCROW_RELEASED, async (data) => {
    console.log('[EventBus] Escrow released:', data);
    
    const payload = data as {
      escrowId: string;
      buyerId: string;
      providerId: string;
      amount: number;
    };

    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.providerId, 'escrow.released', data);
    await emitToUser(payload.buyerId, 'escrow.released', data);

    // Notify provider
    await queueNotification(
      payload.providerId,
      'تم إطلاق المبلغ 💰',
      `تم إطلاق ${payload.amount} لحسابك`
    );

    // Notify buyer
    await queueNotification(
      payload.buyerId,
      'تم إطلاق المبلغ 💰',
      'تم إطلاق المبلغ للمزود'
    );
    
    // Send Socket.io notifications
    await sendSocketNotification(payload.providerId, {
      type: 'booking',
      title: 'تم إطلاق المبلغ 💰',
      message: `تم إطلاق ${payload.amount} لحسابك`,
      data: { escrowId: payload.escrowId },
    });
  });

  // Escrow refunded → Notify buyer
  subscribe(EVENTS.ESCROW_REFUNDED, async (data) => {
    console.log('[EventBus] Escrow refunded:', data);
    
    const payload = data as {
      escrowId: string;
      buyerId: string;
      amount: number;
    };

    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.buyerId, 'escrow.refunded', data);

    await queueNotification(
      payload.buyerId,
      'تم استرداد المبلغ 💸',
      `تم استرداد ${payload.amount} لحسابك`
    );
    
    // Send Socket.io notification
    await sendSocketNotification(payload.buyerId, {
      type: 'booking',
      title: 'تم استرداد المبلغ 💸',
      message: `تم استرداد ${payload.amount} لحسابك`,
      data: { escrowId: payload.escrowId },
    });
  });

  // ============================================
  // Review Events
  // ============================================

  // Review created → Update stats
  subscribe(EVENTS.REVIEW_CREATED, async (data) => {
    console.log('[EventBus] Review created:', data);
    
    const payload = data as {
      reviewId: string;
      reviewerId: string;
      serviceId: string;
      hostId: string;
      rating: number;
    };
    
    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.hostId, 'review.created', data);
    
    // Notify host about new review
    await sendSocketNotification(payload.hostId, {
      type: 'review',
      title: 'مراجعة جديدة ⭐',
      message: `حصلت على تقييم ${payload.rating} نجوم`,
      data: { reviewId: payload.reviewId, serviceId: payload.serviceId },
    });
  });

  // ============================================
  // Dispute Events
  // ============================================

  // Dispute created → Notify admin
  subscribe(EVENTS.DISPUTE_CREATED, async (data) => {
    console.log('[EventBus] Dispute created:', data);
    
    const payload = data as {
      disputeId: string;
      openedBy: string;
      againstUser: string;
    };
    
    // Emit to Socket.io
    await emitToUser(payload.openedBy, 'dispute.created', data);
    await emitToDispute(payload.disputeId, 'dispute.created', data);
  });

  // Dispute resolved → Notify parties
  subscribe(EVENTS.DISPUTE_RESOLVED, async (data) => {
    console.log('[EventBus] Dispute resolved:', data);
    
    const payload = data as {
      disputeId: string;
      openedBy: string;
      againstUser: string;
      decision: string;
    };

    // Emit to Socket.io for real-time frontend update
    await emitToUser(payload.openedBy, 'dispute.resolved', data);
    await emitToUser(payload.againstUser, 'dispute.resolved', data);
    await emitToDispute(payload.disputeId, 'dispute.resolved', data);

    // Notify both parties
    await queueNotification(
      payload.openedBy,
      'تم حل النزاع ⚖️',
      `تم حل النزاع: ${payload.decision}`
    );

    await queueNotification(
      payload.againstUser,
      'تم حل النزاع ⚖️',
      `تم حل النزاع: ${payload.decision}`
    );
    
    // Send Socket.io notifications
    await sendSocketNotification(payload.openedBy, {
      type: 'dispute',
      title: 'تم حل النزاع ⚖️',
      message: `تم حل النزاع: ${payload.decision}`,
      data: { disputeId: payload.disputeId },
    });
    
    await sendSocketNotification(payload.againstUser, {
      type: 'dispute',
      title: 'تم حل النزاع ⚖️',
      message: `تم حل النزاع: ${payload.decision}`,
      data: { disputeId: payload.disputeId },
    });
  });

  // ============================================
  // User Events
  // ============================================

  // User registered → Send welcome email
  subscribe(EVENTS.USER_REGISTERED, async (data) => {
    console.log('[EventBus] User registered:', data);
    
    const payload = data as {
      userId: string;
      email: string;
      displayName: string;
    };

    await queueEmail(
      payload.email,
      'مرحباً بك في منصة ضيف!',
      'welcome',
      { name: payload.displayName }
    );
    
    // Emit to Socket.io
    await emitToUser(payload.userId, 'user.registered', data);
  });

  console.log('[EventBus] Event listeners setup complete');
}

/**
 * Teardown event listeners
 */
export function teardownEventListeners(): void {
  console.log('[EventBus] Tearing down event listeners...');
  unsubscribeAll();
  console.log('[EventBus] Event listeners removed');
}
