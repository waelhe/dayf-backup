/**
 * Socket.io Service - Real-time Events Bridge
 * خدمة Socket.io للاتصال في الوقت الحقيقي
 * 
 * 🏛️ Constitutional Compliance:
 * - المادة V: الاستقلالية بين الوحدات عبر الأحداث فقط
 * - Event Bridge: يربط EventEmitter2 بـ Socket.io
 * 
 * Port: 3003
 * Protocol: WebSocket + HTTP long-polling fallback
 */

import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

// ============================================
// Types
// ============================================

interface UserInfo {
  userId: string;
  role: string;
  rooms: string[];
}

interface NotificationData {
  id: string;
  type: 'booking' | 'review' | 'dispute' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
}

// ============================================
// Server Setup
// ============================================

const PORT = 3003;

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true, // Allow all origins (gateway handles security)
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  path: '/', // Use root path for gateway compatibility
  allowRequest: (req, callback) => {
    // Allow requests from gateway (with XTransformPort query)
    callback(null, true);
  },
});

// ============================================
// User Connections Store
// ============================================

const connectedUsers = new Map<string, UserInfo>();
const userSockets = new Map<string, Set<string>>();

// ============================================
// Event Names (Sync with event-bus.ts)
// ============================================

const EVENTS = {
  // Booking Events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_COMPLETED: 'booking.completed',
  BOOKING_CANCELLED: 'booking.cancelled',

  // Escrow Events
  ESCROW_RELEASED: 'escrow.released',
  ESCROW_REFUNDED: 'escrow.refunded',

  // Review Events
  REVIEW_CREATED: 'review.created',

  // Dispute Events
  DISPUTE_CREATED: 'dispute.created',
  DISPUTE_RESOLVED: 'dispute.resolved',

  // User Events
  USER_VERIFIED: 'user.verified',

  // Notification Events
  NOTIFICATION_NEW: 'notification.new',
  NOTIFICATION_READ: 'notification.read',

  // System Events
  SYSTEM_ALERT: 'system.alert',
};

// ============================================
// Middleware: Authentication
// ============================================

io.use((socket, next) => {
  // Extract user info from auth, headers, or query (for gateway support)
  const userId = socket.handshake.auth.userId 
    || socket.handshake.headers['x-user-id'] 
    || socket.handshake.query.userId;
  const role = socket.handshake.auth.role 
    || socket.handshake.headers['x-user-role'] 
    || socket.handshake.query.role 
    || 'guest';

  // Log connection details for debugging
  console.log(`[Socket] Connection attempt from:`, {
    userId,
    role,
    hasXTransformPort: !!socket.handshake.query.XTransformPort,
    transport: socket.handshake.query.transport,
  });

  if (!userId || userId === 'undefined') {
    socket.data.userId = 'anonymous';
    socket.data.role = 'guest';
    return next();
  }

  socket.data.userId = userId as string;
  socket.data.role = role as string;
  next();
});

// ============================================
// Connection Handler
// ============================================

io.on('connection', (socket: Socket) => {
  const userId = socket.data.userId as string;
  const role = socket.data.role as string;

  console.log(`[Socket] User connected: ${userId} (${role})`);

  // Track connected users
  if (userId !== 'anonymous') {
    connectedUsers.set(socket.id, { userId, role, rooms: [] });
    
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Join role-based room
    socket.join(`role:${role}`);
  }

  // ============================================
  // Event Handlers
  // ============================================

  socket.on('subscribe:events', (events: string[]) => {
    events.forEach(event => {
      socket.join(`event:${event}`);
    });
    socket.emit('subscribed', { events, timestamp: new Date() });
  });

  socket.on('unsubscribe:events', (events: string[]) => {
    events.forEach(event => {
      socket.leave(`event:${event}`);
    });
    socket.emit('unsubscribed', { events, timestamp: new Date() });
  });

  socket.on('join:booking', (bookingId: string) => {
    socket.join(`booking:${bookingId}`);
    socket.emit('joined:booking', { bookingId, timestamp: new Date() });
  });

  socket.on('leave:booking', (bookingId: string) => {
    socket.leave(`booking:${bookingId}`);
  });

  socket.on('join:dispute', (disputeId: string) => {
    socket.join(`dispute:${disputeId}`);
  });

  socket.on('notification:read', (notificationId: string) => {
    if (userId !== 'anonymous') {
      io.to(`user:${userId}`).emit('notification:read', { notificationId });
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date() });
  });

  // ============================================
  // Disconnect Handler
  // ============================================

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] User disconnected: ${userId} (${reason})`);
    
    if (userId !== 'anonymous') {
      connectedUsers.delete(socket.id);
      
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
        }
      }
    }
  });
});

// ============================================
// Event Bridge: External Events → Socket.io
// ============================================

function emitToUser(userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, {
    timestamp: new Date(),
    data,
  });
}

function emitToRole(role: string, event: string, data: unknown): void {
  io.to(`role:${role}`).emit(event, {
    timestamp: new Date(),
    data,
  });
}

function emitToBooking(bookingId: string, event: string, data: unknown): void {
  io.to(`booking:${bookingId}`).emit(event, {
    timestamp: new Date(),
    data,
  });
}

function emitToDispute(disputeId: string, event: string, data: unknown): void {
  io.to(`dispute:${disputeId}`).emit(event, {
    timestamp: new Date(),
    data,
  });
}

function broadcast(event: string, data: unknown): void {
  io.emit(event, {
    timestamp: new Date(),
    data,
  });
}

function sendNotification(userId: string, notification: NotificationData): void {
  io.to(`user:${userId}`).emit(EVENTS.NOTIFICATION_NEW, notification);
}

// ============================================
// HTTP Endpoints for Event Bridge
// Only handle specific paths, let socket.io handle the rest
// ============================================

httpServer.on('request', async (req, res) => {
  const url = req.url || '';

  // Check if headers already sent by socket.io
  if (res.headersSent) return;

  // Only handle specific paths
  if (req.method === 'GET' && (url === '/health' || url.split('?')[0] === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      connectedUsers: connectedUsers.size,
      uptime: process.uptime(),
    }));
    return;
  }

  if (req.method === 'GET' && url === '/online') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      count: userSockets.size,
      users: Array.from(userSockets.keys()),
    }));
    return;
  }

  if (req.method === 'POST' && url.startsWith('/emit/')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (res.headersSent) return;
      try {
        const data = JSON.parse(body);
        const urlParts = url.split('/');
        const targetType = urlParts[2];
        const targetId = urlParts[3];
        const event = urlParts[4];

        switch (targetType) {
          case 'user':
            emitToUser(targetId, event, data);
            break;
          case 'role':
            emitToRole(targetId, event, data);
            break;
          case 'booking':
            emitToBooking(targetId, event, data);
            break;
          case 'dispute':
            emitToDispute(targetId, event, data);
            break;
          case 'broadcast':
            broadcast(event, data);
            break;
          default:
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid target type' }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, emitted: { targetType, targetId, event } }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
});

// ============================================
// Start Server
// ============================================

httpServer.listen(PORT, () => {
  console.log(`[Socket.io] Server running on port ${PORT}`);
  console.log(`[Socket.io] Health check: http://localhost:${PORT}/health`);
  console.log(`[Socket.io] Ready to receive connections`);
});
