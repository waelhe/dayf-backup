# التكامل عبر Webhooks

## 1. نظرة عامة

```
┌──────────────────────────────────────────────────────────────────┐
│                    معمارية Webhooks                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────┐                  ┌───────────┐                  │
│   │   Saleor  │                  │ Discourse │                  │
│   │           │                  │           │                  │
│   │ Orders    │─────┐    ┌─────►│ Reviews   │                  │
│   │ Products  │     │    │      │ Topics    │                  │
│   │ Users     │     │    │      │ Users     │                  │
│   └───────────┘     │    │      └───────────┘                  │
│                     │    │                                      │
│                     ▼    │                                      │
│            ┌────────────────────┐                               │
│            │                    │                               │
│            │       Dayf         │                               │
│            │                    │                               │
│            │  ┌──────────────┐  │                               │
│            │  │   Webhook    │  │                               │
│            │  │   Handlers   │  │                               │
│            │  └──────────────┘  │                               │
│            │                    │                               │
│            └────────────────────┘                               │
│                                                                  │
│   Events Flow:                                                   │
│   • Order Created → Update user orders in Dayf                  │
│   • Review Posted → Link to product in Dayf                     │
│   • Product Updated → Sync with Dayf                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Webhooks من Saleor

### الأحداث المتاحة

| Event | الوصف | الاستخدام |
|-------|-------|----------|
| `ORDER_CREATED` | طلب جديد | تحديث سجل المستخدم |
| `ORDER_FULFILLED` | تم التنفيذ | دعوة للتقييم |
| `ORDER_CANCELLED` | إلغاء الطلب | تحديث الحالة |
| `PAYMENT_CAPTURED` | دفع ناجح | تفعيل الخدمة |
| `PRODUCT_CREATED` | منتج جديد | مزامنة مع Dayf |
| `PRODUCT_UPDATED` | تحديث منتج | مزامنة مع Dayf |
| `CUSTOMER_CREATED` | عميل جديد | مزامنة المستخدم |

### Endpoint في Dayf

```typescript
// src/app/api/webhooks/saleor/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SALEOR_WEBHOOK_SECRET = process.env.SALEOR_WEBHOOK_SECRET!;

// التحقق من التوقيع
function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', SALEOR_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('x-saleor-signature') || '';
  
  // التحقق من التوقيع
  if (!verifySignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const data = JSON.parse(payload);
  const { type, data: eventData } = data;
  
  // معالجة حسب نوع الحدث
  switch (type) {
    case 'ORDER_CREATED':
      await handleOrderCreated(eventData);
      break;
    
    case 'ORDER_FULFILLED':
      await handleOrderFulfilled(eventData);
      break;
    
    case 'PAYMENT_CAPTURED':
      await handlePaymentCaptured(eventData);
      break;
    
    case 'PRODUCT_CREATED':
    case 'PRODUCT_UPDATED':
      await handleProductSync(eventData);
      break;
    
    case 'CUSTOMER_CREATED':
      await handleCustomerCreated(eventData);
      break;
    
    default:
      console.log(`Unhandled webhook type: ${type}`);
  }
  
  return NextResponse.json({ received: true });
}

// معالجات الأحداث

async function handleOrderCreated(order: any) {
  // تحديث سجل المستخدم
  const { db } = await import('@/lib/db');
  
  await db.order.create({
    data: {
      external_id: order.id,
      user_id: order.user_id, // يجب ربطه مع Supabase user
      total: order.total.gross.amount,
      currency: order.total.gross.currency,
      status: 'pending',
      items: order.lines,
      created_at: order.created,
    },
  });
  
  // إرسال إشعار
  await sendNotification(order.user_id, {
    type: 'order_created',
    message: `تم إنشاء طلبك #${order.number} بنجاح`,
    data: { order_id: order.id },
  });
}

async function handleOrderFulfilled(order: any) {
  const { db } = await import('@/lib/db');
  
  await db.order.update({
    where: { external_id: order.id },
    data: { status: 'fulfilled' },
  });
  
  // دعوة للتقييم
  await createReviewInvitation(order);
}

async function handlePaymentCaptured(payment: any) {
  // تحديث حالة الدفع
  const { db } = await import('@/lib/db');
  
  await db.order.update({
    where: { external_id: payment.order_id },
    data: { 
      payment_status: 'paid',
      paid_at: new Date(),
    },
  });
}

async function handleProductSync(product: any) {
  // مزامنة المنتج مع Dayf
  const { db } = await import('@/lib/db');
  
  await db.marketplace_product.upsert({
    where: { external_id: product.id },
    create: {
      external_id: product.id,
      name: product.name,
      description: product.description,
      price: product.pricing?.price_range?.start?.gross?.amount,
      currency: product.pricing?.price_range?.start?.gross?.currency,
      images: product.media?.map((m: any) => m.url) || [],
      category: product.category?.name,
      is_active: product.is_published,
    },
    update: {
      name: product.name,
      description: product.description,
      price: product.pricing?.price_range?.start?.gross?.amount,
      images: product.media?.map((m: any) => m.url) || [],
      is_active: product.is_published,
    },
  });
}

async function handleCustomerCreated(customer: any) {
  // مزامنة العميل
  // يمكن استخدام Supabase للربط
}

async function createReviewInvitation(order: any) {
  // إنشاء دعوة للتقييم
  const { db } = await import('@/lib/db');
  
  for (const item of order.lines) {
    await db.review_invitation.create({
      data: {
        user_id: order.user_id,
        product_id: item.product_id,
        order_id: order.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم
      },
    });
  }
  
  // إرسال إيميل دعوة
  await sendReviewInvitationEmail(order.user_id, order);
}

async function sendNotification(userId: string, notification: any) {
  // إرسال عبر OneSignal أو Supabase Realtime
}

async function sendReviewInvitationEmail(userId: string, order: any) {
  // إرسال عبر Resend
}
```

### تكوين Webhook في Saleor Dashboard

```
1. الذهاب إلى Configuration → Webhooks
2. إنشاء Webhook جديد:
   - Name: Dayf Integration
   - Target URL: https://dayf.app/api/webhooks/saleor
   - Secret: (generate random secret)
   - Events: 
     ☑ ORDER_CREATED
     ☑ ORDER_FULFILLED
     ☑ ORDER_CANCELLED
     ☑ PAYMENT_CAPTURED
     ☑ PRODUCT_CREATED
     ☑ PRODUCT_UPDATED
3. حفظ واختبار
```

---

## 3. Webhooks من Discourse

### الأحداث المتاحة

| Event | الوصف | الاستخدام |
|-------|-------|----------|
| `topic_created` | موضوع جديد | إنشاء نشاط |
| `post_created` | رد جديد | إشعار |
| `user_created` | مستخدم جديد | مزامنة |
| `user_approved` | موافقة مستخدم | تحديث حالة |
| `post_edited` | تعديل رد | تحديث |

### Endpoint في Dayf

```typescript
// src/app/api/webhooks/discourse/route.ts

import { NextRequest, NextResponse } from 'next/server';

const DISCOURSE_WEBHOOK_SECRET = process.env.DISCOURSE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // Discourse يرسل X-Discourse-Event-Type header
  const eventType = request.headers.get('x-discourse-event-type');
  const eventId = request.headers.get('x-discourse-event-id');
  
  const payload = await request.json();
  
  // منع المعالجة المكررة
  const isProcessed = await checkIfProcessed(eventId);
  if (isProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  
  // معالجة حسب نوع الحدث
  switch (eventType) {
    case 'topic_created':
      await handleTopicCreated(payload.topic);
      break;
    
    case 'post_created':
      await handlePostCreated(payload.post);
      break;
    
    case 'user_created':
      await handleUserCreated(payload.user);
      break;
  }
  
  // تسجيل كمعالج
  await markAsProcessed(eventId);
  
  return NextResponse.json({ received: true });
}

async function handleTopicCreated(topic: any) {
  const { db } = await import('@/lib/db');
  
  // إذا كان الموضوع مرتبط بمنتج أو خدمة
  if (topic.custom_fields?.product_id) {
    await db.product_discussion.create({
      data: {
        product_id: topic.custom_fields.product_id,
        topic_id: topic.id,
        topic_title: topic.title,
        created_by: topic.user_id,
      },
    });
  }
  
  // إذا كان الموضوع تقييم
  if (topic.category_id === process.env.DISCOURSE_REVIEWS_CATEGORY_ID) {
    await handleReviewTopic(topic);
  }
}

async function handlePostCreated(post: any) {
  // إشعارات الردود
  const { db } = await import('@/lib/db');
  
  // الحصول على معلومات الموضوع
  const topic = await getTopicFromDiscourse(post.topic_id);
  
  if (topic.custom_fields?.product_id) {
    // رد على مناقشة منتج
    await db.product_comment.create({
      data: {
        product_id: topic.custom_fields.product_id,
        external_id: post.id,
        user_id: post.user_id,
        content: post.raw,
      },
    });
  }
}

async function handleReviewTopic(topic: any) {
  const { db } = await import('@/lib/db');
  
  // تحويل الموضوع إلى تقييم
  const reviewData = parseReviewFromTopic(topic);
  
  await db.review.create({
    data: {
      external_id: `discourse_${topic.id}`,
      reference_type: reviewData.type,
      reference_id: reviewData.reference_id,
      user_id: topic.user_id,
      rating: reviewData.rating,
      title: topic.title,
      content: topic.posts[0]?.raw || '',
      source: 'discourse',
    },
  });
}

// منع المعالجة المكررة
const processedEvents = new Set<string>();

async function checkIfProcessed(eventId: string | null): Promise<boolean> {
  if (!eventId) return false;
  
  // استخدم Redis للإنتاج
  const { redis } = await import('@/infrastructure/redis');
  return await redis.exists(`webhook:discourse:${eventId}`);
}

async function markAsProcessed(eventId: string | null): Promise<void> {
  if (!eventId) return;
  
  const { redis } = await import('@/infrastructure/redis');
  await redis.setex(`webhook:discourse:${eventId}`, 86400, '1'); // 24 ساعة
}
```

### تكوين Webhook في Discourse

```
1. الذهاب إلى Admin → Settings → Webhooks
2. إنشاء Webhook جديد:
   - URL: https://dayf.app/api/webhooks/discourse
   - Content Type: application/json
   - Secret: (generate random secret)
   - Events:
     ☑ topic_created
     ☑ post_created
     ☑ user_created
3. حفظ واختبار
```

---

## 4. Webhooks من Dayf

### الأحداث المرسلة

| Event | الوصف | المستقبل |
|-------|-------|----------|
| `booking_created` | حجز جديد | Saleor (إنشاء طلب) |
| `review_created` | تقييم جديد | Discourse (إنشاء موضوع) |
| `user_updated` | تحديث مستخدم | Discourse, Saleor |

### إرسال Webhooks

```typescript
// src/lib/webhooks/client.ts

interface WebhookPayload {
  type: string;
  data: any;
  timestamp: number;
}

export class WebhookClient {
  private endpoints: Map<string, string[]>;
  
  constructor() {
    this.endpoints = new Map([
      ['booking_created', [process.env.SALEOR_WEBHOOK_URL!]],
      ['review_created', [process.env.DISCOURSE_WEBHOOK_URL!]],
      ['user_updated', [
        process.env.SALEOR_WEBHOOK_URL!,
        process.env.DISCOURSE_WEBHOOK_URL!,
      ]],
    ]);
  }
  
  async emit(type: string, data: any): Promise<void> {
    const endpoints = this.endpoints.get(type) || [];
    
    const payload: WebhookPayload = {
      type,
      data,
      timestamp: Date.now(),
    };
    
    const signature = this.generateSignature(payload);
    
    await Promise.all(
      endpoints.map(endpoint =>
        this.send(endpoint, payload, signature)
      )
    );
  }
  
  private generateSignature(payload: WebhookPayload): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', process.env.DAYF_WEBHOOK_SECRET!)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
  
  private async send(
    endpoint: string,
    payload: WebhookPayload,
    signature: string
  ): Promise<void> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dayf-Signature': signature,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error(`Webhook failed: ${endpoint}`, await response.text());
      // إعادة المحاولة لاحقاً
      await this.queueForRetry(endpoint, payload);
    }
  }
  
  private async queueForRetry(endpoint: string, payload: WebhookPayload): Promise<void> {
    // إضافة للـ queue للإعادة لاحقاً
  }
}

// استخدام
export const webhookClient = new WebhookClient();

// في أي مكان في الكود
await webhookClient.emit('booking_created', {
  booking_id: '123',
  user_id: '456',
  service_id: '789',
  total: 500,
});
```

---

## 5. Retry Queue

```typescript
// src/lib/webhooks/queue.ts

import { db } from '@/lib/db';

interface QueuedWebhook {
  id: string;
  endpoint: string;
  payload: any;
  attempts: number;
  max_attempts: number;
  next_retry: Date;
  created_at: Date;
}

export class WebhookQueue {
  private maxAttempts = 5;
  private retryDelays = [60, 300, 900, 3600, 86400]; // ثواني
  
  async enqueue(
    endpoint: string,
    payload: any,
    options?: { max_attempts?: number }
  ): Promise<string> {
    const id = crypto.randomUUID();
    
    await db.webhook_queue.create({
      data: {
        id,
        endpoint,
        payload,
        attempts: 0,
        max_attempts: options?.max_attempts || this.maxAttempts,
        next_retry: new Date(),
        created_at: new Date(),
      },
    });
    
    return id;
  }
  
  async processQueue(): Promise<void> {
    const pending = await db.webhook_queue.findMany({
      where: {
        next_retry: { lte: new Date() },
        attempts: { lt: db.webhook_queue.fields.max_attempts },
      },
      take: 100,
    });
    
    for (const item of pending) {
      await this.processItem(item);
    }
  }
  
  private async processItem(item: QueuedWebhook): Promise<void> {
    try {
      const response = await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      
      if (response.ok) {
        // نجح، حذف من القائمة
        await db.webhook_queue.delete({ where: { id: item.id } });
      } else {
        // فشل، جدولة للإعادة
        await this.scheduleRetry(item);
      }
    } catch (error) {
      await this.scheduleRetry(item);
    }
  }
  
  private async scheduleRetry(item: QueuedWebhook): Promise<void> {
    const attempts = item.attempts + 1;
    
    if (attempts >= item.max_attempts) {
      // تم الوصول للحد الأقصى، تسجيل كفاشل
      await db.webhook_queue.update({
        where: { id: item.id },
        data: { 
          attempts,
          failed_at: new Date(),
        },
      });
      return;
    }
    
    const delay = this.retryDelays[attempts - 1] || 86400;
    const nextRetry = new Date(Date.now() + delay * 1000);
    
    await db.webhook_queue.update({
      where: { id: item.id },
      data: { attempts, next_retry: nextRetry },
    });
  }
}

// Cron job للمعالجة
// كل دقيقة
export async function GET() {
  const queue = new WebhookQueue();
  await queue.processQueue();
  return Response.json({ processed: true });
}
```

---

## 6. اختبار Webhooks

### اختبار محلي

```bash
# إنشاء webhook endpoint محلي للاختبار
npx ngrok http 3000

# استخدام ngrok URL في Saleor/Discourse
# https://xxx.ngrok.io/api/webhooks/saleor
```

### إرسال webhook تجريبي

```bash
# Saleor webhook test
curl -X POST https://dayf.app/api/webhooks/saleor \
  -H "Content-Type: application/json" \
  -H "X-Saleor-Signature: <signature>" \
  -d '{
    "type": "ORDER_CREATED",
    "data": {
      "id": "test-order-123",
      "number": "1001",
      "user_id": "user-456",
      "total": {
        "gross": { "amount": 500, "currency": "SAR" }
      },
      "lines": [],
      "created": "2024-01-01T00:00:00Z"
    }
  }'

# Discourse webhook test
curl -X POST https://dayf.app/api/webhooks/discourse \
  -H "Content-Type: application/json" \
  -H "X-Discourse-Event-Type: topic_created" \
  -H "X-Discourse-Event-Id: test-123" \
  -d '{
    "topic": {
      "id": 123,
      "title": "تجربة المنتج",
      "user_id": "user-456",
      "category_id": 5,
      "custom_fields": {
        "product_id": "product-789"
      }
    }
  }'
```

---

## 7. مراقبة Webhooks

```typescript
// src/app/api/webhooks/status/route.ts

import { db } from '@/lib/db';

export async function GET() {
  // إحصائيات Webhooks
  const stats = await db.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      type,
      COUNT(*) as total,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN success THEN 0 ELSE 1 END) as failed
    FROM webhook_logs
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at), type
    ORDER BY date DESC, type
  `;
  
  // Webhooks معلقة
  const pending = await db.webhook_queue.count({
    where: {
      attempts: { lt: 5 },
      failed_at: null,
    },
  });
  
  // Webhooks فاشلة
  const failed = await db.webhook_queue.count({
    where: { failed_at: { not: null } },
  });
  
  return Response.json({
    stats,
    pending,
    failed,
  });
}
```

---

## 8. الأمان

```
┌─────────────────────────────────────────────────────────────────┐
│                    أمان Webhooks                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ تحقق من التوقيع دائماً                                      │
│  ✅ استخدم HTTPS فقط                                           │
│  ✅ سجل كل Webhooks للمراجعة                                   │
│  ✅ حدد IP whitelist (إن أمكن)                                 │
│  ✅ منع المعالجة المكررة (idempotency)                         │
│  ✅ استخدم queue للإعادة                                       │
│                                                                 │
│  ❌ لا تثق بالبيانات بدون تحقق                                 │
│  ❌ لا تعالج Webhooks بشكل متزامن طويل                        │
│  ❌ لا ترسل بيانات حساسة في Webhooks                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. الخطوة التالية

- [optimization.md](./optimization.md) - تحسين الأداء
