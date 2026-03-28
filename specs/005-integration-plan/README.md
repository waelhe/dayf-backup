# خطة التكامل الشاملة - Dayf + Discourse + Saleor

## نظرة عامة

هذا المجلد يحتوي على خطة التكامل الكاملة لإضافة Discourse (منتدى) و Saleor (سوق) إلى نظام Dayf الحالي.

## الملفات

| الملف | الوصف |
|-------|-------|
| [plan.md](./plan.md) | الخطة الكاملة |
| [architecture.md](./architecture.md) | البنية المعمارية |
| [discourse-setup.md](./discourse-setup.md) | إعداد Discourse |
| [saleor-setup.md](./saleor-setup.md) | إعداد Saleor |
| [sso-integration.md](./sso-integration.md) | التكامل عبر SSO |
| [webhooks.md](./webhooks.md) | التكامل عبر Webhooks |
| [optimization.md](./optimization.md) | خطة التحسين |

## ملخص سريع

```
الوضع الحالي:
├── الخادم المحلي (Sandbox)
│   ├── Dayf (:3000) ← يتصل بـ Supabase
│   └── (هنا نضيف Discourse + Saleor)
├── Supabase (Cloud)
│   └── Dayf Database + Auth + Storage
└── Vercel (Production)
    └── ❌ منفصل تماماً - لا علاقة للتطوير

الخطة:
├── إبقاء Dayf متصلاً بـ Supabase (كما هو)
├── تثبيت PostgreSQL + Redis محلياً
├── تثبيت Discourse محلياً
├── تثبيت Saleor محلياً
└── التكامل عبر SSO و Webhooks
```

## التكلفة

| الخدمة | التكلفة |
|--------|---------|
| Supabase Pro | $25/شهر |
| Vercel | مجاني / $20 |
| الخادم المحلي | مجاني (Sandbox) |

## المدة المتوقعة

- **2-3 أسابيع** للنظام الكامل

## الحالة

- [ ] المرحلة 1: البنية التحتية المحلية
- [ ] المرحلة 2: Discourse
- [ ] المرحلة 3: Saleor
- [ ] المرحلة 4: التكامل
- [ ] المرحلة 5: التحسين

**تاريخ البدء:** $(date +%Y-%m-%d)

---

## روابط الوثائق للتحميل

| الوثيقة | المسار |
|---------|--------|
| 📄 الخطة الكاملة | `specs/005-integration-plan/plan.md` |
| 📄 البنية المعمارية | `specs/005-integration-plan/architecture.md` |
| 📄 إعداد Discourse | `specs/005-integration-plan/discourse-setup.md` |
| 📄 إعداد Saleor | `specs/005-integration-plan/saleor-setup.md` |
| 📄 التكامل SSO | `specs/005-integration-plan/sso-integration.md` |
| 📄 Webhooks | `specs/005-integration-plan/webhooks.md` |
| 📄 التحسين | `specs/005-integration-plan/optimization.md` |
