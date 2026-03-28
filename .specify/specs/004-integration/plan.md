# خطة التنفيذ: تكامل Discourse + Saleor
**المواصفة:** `.specify/specs/004-integration/spec.md`
**التاريخ:** 2025

---

## تقييم الدستور (Gates)

□ AI لديه fallback؟ (المادة II) — لا AI في هذه المرحلة ✅
□ Soft Delete للبيانات الحساسة؟ (المادة I) — لا تأثير ✅
□ التواصل عبر Events؟ (المادة V) — Webhooks ✅
□ Zod على كل input؟ (المادة VI) — SSO آمن ✅
□ RTL مدعوم؟ (المادة III) — Discourse يدعم RTL ✅

---

## الهيكل المعماري

### البنية الكلية

```
┌──────────────────────────────────────────────────────────────────┐
│                        السحابة (Cloud)                            │
│                                                                  │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │     Vercel      │        │    Supabase     │                │
│  │                 │        │                 │                │
│  │  Dayf (Prod)    │◄──────►│  • PostgreSQL   │                │
│  │  Production     │        │  • Auth ◄───────┼──── SSO       │
│  │                 │        │  • Storage      │     Provider   │
│  └─────────────────┘        └─────────────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ API/Webhooks
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                    الخادم المحلي (Sandbox)                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   البنية التحتية                             ││
│  │                                                             ││
│  │  ┌─────────────┐  ┌─────────────┐                          ││
│  │  │ PostgreSQL  │  │    Redis    │                          ││
│  │  │   :5432     │  │   :6379     │                          ││
│  │  │             │  │             │                          ││
│  │  │ • discourse │  │ • DB0: disc │                          ││
│  │  │ • saleor    │  │ • DB1: sal  │                          ││
│  │  └─────────────┘  └─────────────┘                          ││
│  │                                                           ││
│  └───────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌───────────────────────────────────────────────────────────┐│
│  │                    التطبيقات                               ││
│  │                                                           ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐            ││
│  │  │   Dayf    │  │ Discourse │  │  Saleor   │            ││
│  │  │  :3000    │  │   :3001   │  │  :3002    │            ││
│  │  │           │  │           │  │           │            ││
│  │  │ Next.js   │  │ Ruby/Rails│  │ Django    │            ││
│  │  │ Supabase  │  │ Local PG  │  │ GraphQL   │            ││
│  │  │ (Cloud)   │  │ Local RD  │  │ Local PG  │            ││
│  │  └───────────┘  └───────────┘  └───────────┘            ││
│  │                                                           ││
│  └───────────────────────────────────────────────────────────┘│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### المنافذ (Ports)

| الخدمة | المنفذ | الوصف |
|--------|--------|-------|
| Dayf | 3000 | التطبيق الرئيسي |
| Discourse | 3001 | المنتدى |
| Saleor API | 3002 | GraphQL API |
| Saleor Dashboard | 3003 | لوحة التحكم |
| PostgreSQL | 5432 | قاعدة البيانات |
| Redis | 6379 | التخزين المؤقت |

---

## مراحل التنفيذ

### المرحلة 1: البنية التحتية المحلية (1-2 يوم)

```
الأهداف:
├── تثبيت PostgreSQL محلياً
├── تثبيت Redis محلياً
├── إنشاء databases
│   ├── discourse
│   └── saleor
└── اختبار الاتصال

الخطوات:
1. تثبيت PostgreSQL
   $ sudo apt install postgresql postgresql-contrib
   $ sudo systemctl start postgresql

2. إنشاء Databases
   $ sudo -u postgres createuser discourse -P
   $ sudo -u postgres createdb discourse -O discourse
   $ sudo -u postgres createuser saleor -P
   $ sudo -u postgres createdb saleor -O saleor

3. تثبيت Redis
   $ sudo apt install redis
   $ sudo systemctl start redis

4. اختبار الاتصال
   $ psql -U discourse -d discourse -h localhost
   $ redis-cli ping
```

### المرحلة 2: Discourse (3-5 أيام)

```
الأهداف:
├── تثبيت Ruby + Rails
├── تثبيت Discourse
├── ربط مع PostgreSQL
├── ربط مع Redis
├── تكوين أساسي
└── قياس الاستهلاك

الخطوات:
1. تثبيت Ruby
   $ rbenv install 3.2.0
   $ gem install bundler

2. تحميل Discourse
   $ git clone https://github.com/discourse/discourse.git
   $ cd discourse
   $ bundle install

3. التكوين
   $ cp config/discourse_defaults.conf config/discourse.conf
   # تعديل الإعدادات

4. تشغيل
   $ bundle exec rails server -p 3001
   $ bundle exec sidekiq
```

### المرحلة 3: Saleor (5-7 أيام)

```
الأهداف:
├── تثبيت Python + pip
├── تثبيت Saleor Core
├── تثبيت Dashboard
├── ربط مع PostgreSQL
├── ربط مع Redis
├── تكوين أساسي
└── قياس الاستهلاك

الخطوات:
1. تثبيت Python
   $ pyenv install 3.11
   $ pip install pipenv

2. تحميل Saleor
   $ git clone https://github.com/saleor/saleor.git
   $ cd saleor
   $ pipenv install

3. التكوين
   $ cp saleor/settings.py saleor/settings_local.py
   # تعديل الإعدادات

4. تشغيل
   $ pipenv run python manage.py migrate
   $ pipenv run python manage.py runserver 0.0.0.0:3002
```

### المرحلة 4: التكامل SSO (3-5 أيام)

```
الأهداف:
├── إعداد SSO مع Supabase Auth
├── إعداد Webhooks
├── اختبار التكامل
└── تحسين الأداء

SSO:
├── Supabase Auth = Identity Provider
├── Discourse = SSO Client
└── Saleor = External Auth

Webhooks:
├── Saleor → Dayf (Orders)
├── Discourse → Dayf (Reviews)
└── Dayf → Saleor (User events)
```

### المرحلة 5: التحسين التدريجي (مستمر)

```
الأهداف:
├── مراقبة الاستهلاك
├── تعطيل الميزات غير المستخدمة
├── تحسين الإعدادات
└── تقليل الموارد

القياسات:
├── الذاكرة قبل/بعد كل تغيير
├── زمن الاستجابة
├── عدد العمليات
└── استخدام CPU
```

---

## خريطة التبعيات

```
Dayf (موجود ✅)
    ↓ يعتمد على
Supabase (Cloud) — موجود ✅

البنية التحتية الجديدة:
    ↓ تتطلب
PostgreSQL (محلي) ← يجب تثبيته أولاً
Redis (محلي)      ← يجب تثبيته أولاً
    ↓ تُثبّت فوقها
Discourse         ← يحتاج PG + Redis
Saleor            ← يحتاج PG + Redis
    ↓ تتكامل عبر
SSO + Webhooks    ← يحتاج الأنظمة تعمل
```

---

## نقاط التوسع المستقبلية

```typescript
// Extension points للمستقبل

// 1. SSO Extension
interface SSOProvider {
  verifyToken(token: string): Promise<SSOUser>;
  createSession(user: SSOUser): Promise<Session>;
}

// 2. Webhook Extension
interface WebhookHandler {
  handleEvent(event: WebhookEvent): Promise<void>;
}

// 3. Feature Toggle
interface FeatureToggle {
  isEnabled(feature: string): boolean;
  enable(feature: string): void;
  disable(feature: string): void;
}
```

---

## قرارات تقنية جديدة

### ADR-008: تثبيت الأنظمة كما هي ثم التحسين تدريجياً

**التاريخ:** 2025
**الحالة:** ✅ مُقرر

**القرار:** تثبيت Discourse و Saleor بالإعدادات الافتراضية أولاً، ثم التحسين تدريجياً.

**السبب:**
- فهم أفضل للاحتياجات الفعلية
- قياس الاستهلاك الحقيقي
- تجنب تعقيدات مبكرة

**المقايضة:** استهلاك موارد أعلى في البداية (~4-5 GB)، لكن سلامة أكبر.

**شرط التغيير:** بعد شهر من التشغيل وقياس الأحمال الفعلية.

---

## مخاطر التخفيف

| المخاطرة | الاحتمال | التأثير | التخفيف |
|----------|----------|---------|---------|
| استهلاك عالٍ للذاكرة | متوسط | عالي | تحسين تدريجي |
| تعقيد SSO | منخفض | متوسط | اختبار جيد |
| مشاكل الاتصال | منخفض | متوسط | مراقبة مستمرة |
| تعارض المنافذ | منخفض | منخفض | تخطيط مسبق |

---

## نتائج متوقعة

```
الاستهلاك الأولي (قبل التحسين):
├── Dayf:        300-400 MB
├── Discourse:   1.5-2 GB
├── Saleor:      1.5-2 GB
├── PostgreSQL:  400-600 MB
├── Redis:       200-300 MB
└── المجموع:     4-5.5 GB

الاستهلاك بعد التحسين:
├── Dayf:        200-300 MB
├── Discourse:   800 MB-1 GB
├── Saleor:      400-600 MB
├── PostgreSQL:  200-300 MB
├── Redis:       100-150 MB
└── المجموع:     1.8-2.5 GB

التوفير: ~2.5-3 GB
```
