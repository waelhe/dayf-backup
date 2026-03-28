/**
 * Event Bridge - Next.js to Socket.io
 * جسر الأحداث - يربط Next.js API بـ Socket.io Service
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة V: الاستقلالية بين الوحدات عبر الأحداث فقط
 * - لا استدعاء مباشر - استخدام Event Bus + Socket.io
 */

import { publish, EVENTS } from '@/infrastructure/events/event-bus';

// ============================================
// Types
// ============================================

interface SocketEmitOptions {
  targetType: 'user' | 'role' | 'booking' | 'dispute' | 'broadcast';
  targetId: string;
  event: string;
  data: unknown;
}

interface NotificationData {
  id: string;
  type: 'booking' | 'review' | 'dispute' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================
// Configuration
// ============================================

const SOCKET_SERVICE_PORT = 3003;

// ============================================
// Socket.io Emission Functions
// ============================================

/**
 * Emit event to Socket.io service
 * Internal helper for making HTTP requests to socket service
 */
async function emitToSocket(options: SocketEmitOptions): Promise<boolean> {
  try {
    const { targetType, targetId, event, data } = options;
    
    const response = await fetch(
      `http://localhost:${SOCKET_SERVICE_PORT}/emit/${targetType}/${targetId}/${event}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    return response.ok;
  } catch (error) {
    // Don't throw - socket service might not be running
    return false;
  }
}

// ============================================
// User-specific Emissions
// ============================================

/**
 * Emit event to specific user
 */
export async function emitToUser(
  userId: string,
  event: string,
  data: unknown
): Promise<boolean> {
  // Also publish to local event bus
  publish(event, data, 'event-bridge');
  
  return emitToSocket({
    targetType: 'user',
    targetId: userId,
    event,
    data,
  });
}

/**
 * Send notification to user
 */
export async function sendNotification(
  userId: string,
  notification: NotificationData
): Promise<boolean> {
  return emitToUser(userId, EVENTS.NOTIFICATION_SENT, {
    ...notification,
    createdAt: new Date(),
    read: false,
  });
}

// ============================================
// Booking Events
// ============================================

/**
 * Notify booking creation
 */
export async function notifyBookingCreated(
  bookingId: string,
  guestId: string,
  hostId: string,
  data: Record<string, unknown>
): Promise<void> {
  // Notify guest
  await emitToUser(guestId, EVENTS.BOOKING_CREATED, {
    bookingId,
    ...data,
    message: 'تم إنشاء حجزك بنجاح',
  });

  // Notify host
  await emitToUser(hostId, EVENTS.BOOKING_CREATED, {
    bookingId,
    ...data,
    message: 'لديك حجز جديد',
  });

  // Publish to event bus for other listeners
  publish(EVENTS.BOOKING_CREATED, { bookingId, guestId, hostId, ...data }, 'event-bridge');
}

/**
 * Notify booking confirmation
 */
export async function notifyBookingConfirmed(
  bookingId: string,
  guestId: string,
  hostId: string,
  data: Record<string, unknown>
): Promise<void> {
  await emitToUser(guestId, EVENTS.BOOKING_CONFIRMED, {
    bookingId,
    ...data,
    message: 'تم تأكيد حجزك',
  });

  await emitToUser(hostId, EVENTS.BOOKING_CONFIRMED, {
    bookingId,
    ...data,
    message: 'تم تأكيد الحجز',
  });

  publish(EVENTS.BOOKING_CONFIRMED, { bookingId, guestId, hostId, ...data }, 'event-bridge');
}

/**
 * Notify booking completion
 */
export async function notifyBookingCompleted(
  bookingId: string,
  guestId: string,
  hostId: string,
  data: Record<string, unknown>
): Promise<void> {
  await emitToUser(guestId, EVENTS.BOOKING_COMPLETED, {
    bookingId,
    ...data,
    message: 'اكتملت إقامتك! شاركنا رأيك',
    showReviewPrompt: true,
  });

  await emitToUser(hostId, EVENTS.BOOKING_COMPLETED, {
    bookingId,
    ...data,
    message: 'اكتمل الحجز',
  });

  publish(EVENTS.BOOKING_COMPLETED, { bookingId, guestId, hostId, ...data }, 'event-bridge');
}

/**
 * Notify booking cancellation
 */
export async function notifyBookingCancelled(
  bookingId: string,
  guestId: string,
  hostId: string,
  reason: string
): Promise<void> {
  await emitToUser(guestId, EVENTS.BOOKING_CANCELLED, {
    bookingId,
    reason,
    message: 'تم إلغاء الحجز',
  });

  await emitToUser(hostId, EVENTS.BOOKING_CANCELLED, {
    bookingId,
    reason,
    message: 'تم إلغاء الحجز من قبل الضيف',
  });

  publish(EVENTS.BOOKING_CANCELLED, { bookingId, guestId, hostId, reason }, 'event-bridge');
}

// ============================================
// Escrow Events
// ============================================

/**
 * Notify escrow release
 */
export async function notifyEscrowReleased(
  escrowId: string,
  bookingId: string,
  hostId: string,
  amount: number
): Promise<void> {
  await emitToUser(hostId, EVENTS.ESCROW_RELEASED, {
    escrowId,
    bookingId,
    amount,
    message: `تم إطلاق المبلغ المحجوز: ${amount}`,
  });

  publish(EVENTS.ESCROW_RELEASED, { escrowId, bookingId, hostId, amount }, 'event-bridge');
}

/**
 * Notify escrow refund
 */
export async function notifyEscrowRefunded(
  escrowId: string,
  bookingId: string,
  guestId: string,
  amount: number
): Promise<void> {
  await emitToUser(guestId, EVENTS.ESCROW_REFUNDED, {
    escrowId,
    bookingId,
    amount,
    message: `تم استرداد المبلغ: ${amount}`,
  });

  publish(EVENTS.ESCROW_REFUNDED, { escrowId, bookingId, guestId, amount }, 'event-bridge');
}

// ============================================
// Review Events
// ============================================

/**
 * Notify new review
 */
export async function notifyReviewCreated(
  reviewId: string,
  hostId: string,
  rating: number,
  comment: string
): Promise<void> {
  await emitToUser(hostId, EVENTS.REVIEW_CREATED, {
    reviewId,
    rating,
    commentPreview: comment.slice(0, 100),
    message: `تقييم جديد: ${rating} نجوم`,
  });

  publish(EVENTS.REVIEW_CREATED, { reviewId, hostId, rating }, 'event-bridge');
}

// ============================================
// Dispute Events
// ============================================

/**
 * Notify dispute creation
 */
export async function notifyDisputeCreated(
  disputeId: string,
  guestId: string,
  hostId: string,
  reason: string
): Promise<void> {
  await emitToUser(guestId, EVENTS.DISPUTE_CREATED, {
    disputeId,
    reason,
    message: 'تم فتح نزاع على الحجز',
  });

  await emitToUser(hostId, EVENTS.DISPUTE_CREATED, {
    disputeId,
    reason,
    message: 'تم فتح نزاع على حجزك',
  });

  publish(EVENTS.DISPUTE_CREATED, { disputeId, guestId, hostId, reason }, 'event-bridge');
}

/**
 * Notify dispute resolution
 */
export async function notifyDisputeResolved(
  disputeId: string,
  winnerId: string,
  loserId: string,
  decision: string
): Promise<void> {
  await emitToUser(winnerId, EVENTS.DISPUTE_RESOLVED, {
    disputeId,
    decision,
    won: true,
    message: 'تم حل النزاع لصالحك',
  });

  await emitToUser(loserId, EVENTS.DISPUTE_RESOLVED, {
    disputeId,
    decision,
    won: false,
    message: 'تم حل النزاع',
  });

  publish(EVENTS.DISPUTE_RESOLVED, { disputeId, winnerId, loserId, decision }, 'event-bridge');
}

// ============================================
// Role-based Emissions
// ============================================

/**
 * Emit to all admin users
 */
export async function emitToAdmins(event: string, data: unknown): Promise<boolean> {
  return emitToSocket({
    targetType: 'role',
    targetId: 'admin',
    event,
    data,
  });
}

/**
 * Emit to all hosts
 */
export async function emitToHosts(event: string, data: unknown): Promise<boolean> {
  return emitToSocket({
    targetType: 'role',
    targetId: 'host',
    event,
    data,
  });
}

// ============================================
// System-wide Emissions
// ============================================

/**
 * Broadcast to all connected users
 */
export async function broadcast(event: string, data: unknown): Promise<boolean> {
  return emitToSocket({
    targetType: 'broadcast',
    targetId: 'all',
    event,
    data,
  });
}

/**
 * Send system alert to all users
 */
export async function sendSystemAlert(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'error' = 'info'
): Promise<boolean> {
  return broadcast(EVENTS.SYSTEM_ALERT, {
    title,
    message,
    severity,
    timestamp: new Date(),
  });
}

// ============================================
// Health Check
// ============================================

/**
 * Check if socket service is running
 */
export async function isSocketServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${SOCKET_SERVICE_PORT}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get connected users count
 */
export async function getConnectedUsersCount(): Promise<number> {
  try {
    const response = await fetch(`http://localhost:${SOCKET_SERVICE_PORT}/online`, {
      method: 'GET',
    });
    if (response.ok) {
      const data = await response.json();
      return data.count;
    }
    return 0;
  } catch {
    return 0;
  }
}
