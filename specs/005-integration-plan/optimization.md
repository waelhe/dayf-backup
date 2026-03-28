# خطة التحسين التدريجي

## 1. الهدف

```
┌─────────────────────────────────────────────────────────────────┐
│                    الهدف من التحسين                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   من:                                                           │
│   ┌────────────────────────────────────────────────────────┐   │
│   │  الاستهلاك الأولي: 4-5.5 GB RAM                        │   │
│   │  الخادم المطلوب: Hetzner CPX51 (~$15/شهر)              │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                 │
│                          ▼                                      │
│                                                                 │
│   إلى:                                                          │
│   ┌────────────────────────────────────────────────────────┐   │
│   │  الاستهلاك النهائي: 1.8-2.5 GB RAM                     │   │
│   │  الخادم المطلوب: Hetzner CPX21 (~$4/شهر)               │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                 │
│   التوفير: ~2.5-3 GB RAM = ~$11/شهر                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. منهجية التحسين

```
┌─────────────────────────────────────────────────────────────────┐
│                    منهجية التحسين الآمنة                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │   1️⃣ قِيَس ← 2️⃣ غيّر شيئاً واحداً ← 3️⃣ قِيَس               │  │
│   │                       │                                 │  │
│   │                       ▼                                 │  │
│   │              4️⃣ قارن النتائج                            │  │
│   │                       │                                 │  │
│   │              ┌────────┴────────┐                        │  │
│   │              ▼                 ▼                        │  │
│   │          تحسن ◄──────► تراجع                            │  │
│   │              │                 │                        │  │
│   │              ▼                 ▼                        │  │
│   │          احتفظ            ارجع التغيير                   │  │
│   │              │                 │                        │  │
│   │              └────────┬────────┘                        │  │
│   │                       │                                 │  │
│   │                       ▼                                 │  │
│   │              التغيير التالي                             │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ⚠️ لا تغيّر أكثر من شيء واحد في المرة                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. أدوات القياس

### سكريبت المراقبة

```bash
#!/bin/bash
# /usr/local/bin/monitor-resources.sh

echo "=== $(date) ==="
echo ""

# الذاكرة
echo "--- Memory ---"
free -h
echo ""

# العمليات
echo "--- Processes ---"
ps aux --sort=-%mem | head -20
echo ""

# PostgreSQL
echo "--- PostgreSQL ---"
psql -U postgres -c "
SELECT 
  datname as database,
  pg_size_pretty(pg_database_size(datname)) as size,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname) as connections
FROM pg_database d
WHERE datistemplate = false;
"
echo ""

# Redis
echo "--- Redis ---"
redis-cli info memory | grep -E "used_memory_human|used_memory_peak_human"
redis-cli dbsize
echo ""

# Discourse
echo "--- Discourse ---"
ps aux | grep -E "unicorn|sidekiq" | grep -v grep
echo ""

# Saleor
echo "--- Saleor ---"
ps aux | grep -E "gunicorn|celery" | grep -v grep
echo ""

# Response Times
echo "--- Response Times ---"
curl -o /dev/null -s -w "Dayf: %{time_total}s\n" http://localhost:3000/
curl -o /dev/null -s -w "Discourse: %{time_total}s\n" http://localhost:3001/
curl -o /dev/null -s -w "Saleor: %{time_total}s\n" http://localhost:3002/graphql/
echo ""
```

### Cron للمراقبة المستمرة

```bash
# /etc/cron.d/resource-monitor

# كل 5 دقائق
*/5 * * * * root /usr/local/bin/monitor-resources.sh >> /var/log/resources.log
```

---

## 4. مراحل التحسين

### المرحلة 0: Baseline (الأساس)

```
┌─────────────────────────────────────────────────────────────────┐
│                    القياسات الأولية                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  قبل أي تحسين، سجّل:                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ المكون          │ الذاكرة    │ CPU      │ Response Time │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Dayf            │ ___ MB     │ ___%     │ ___ ms        │   │
│  │ Discourse       │ ___ MB     │ ___%     │ ___ ms        │   │
│  │ Saleor          │ ___ MB     │ ___%     │ ___ ms        │   │
│  │ PostgreSQL      │ ___ MB     │ ___%     │ -             │   │
│  │ Redis           │ ___ MB     │ ___%     │ -             │   │
│  │ Celery/Sidekiq  │ ___ MB     │ ___%     │ -             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ المجموع         │ ___ MB     │ ___%     │ -             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  اختبارات الأداء:                                               │
│  • تحميل الصفحة الرئيسية: ___ ms                                │
│  • إنشاء طلب جديد: ___ ms                                       │
│  • البحث في المنتدى: ___ ms                                     │
│  • GraphQL query معقدة: ___ ms                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### المرحلة 1: Discourse

#### 1.1 تقليل Unicorn Workers

```ruby
# config/unicorn.conf.rb

# قبل
workers = 4

# بعد
workers = 1
threads = 4
worker_class = "gthread"

# التوفير المتوقع: ~600 MB
```

**القياس قبل:**
```
Workers: 4
Memory: 1.5 GB
```

**القياس بعد:**
```
Workers: 1 + 4 threads
Memory: ___ MB
Change: ___ MB
```

#### 1.2 تقليل Sidekiq Concurrency

```yaml
# config/sidekiq.yml

# قبل
:concurrency: 5

# بعد
:concurrency: 2

# التوفير المتوقع: ~100 MB
```

#### 1.3 تعطيل الميزات غير المستخدمة

```yaml
# config/settings.yml

# تعطيل
enable_user_directory: false
enable_s3_uploads: false
enable_s3_inventory: false

# تقليل الحدود
max_topics_per_day: 10
max_posts_per_day: 50

# التوفير المتوقع: ~100 MB
```

#### 1.4 Redis Optimization

```conf
# /etc/redis/redis.conf

# قبل
maxmemory: unlimited

# بعد
maxmemory 256mb
maxmemory-policy allkeys-lru

# التوفير المتوقع: حد أقصى 256 MB
```

---

### المرحلة 2: Saleor

#### 2.1 تقليل Gunicorn Workers

```python
# gunicorn_conf.py

# قبل
workers = 4

# بعد
workers = 1
threads = 4
worker_class = "gthread"

# التوفير المتوقع: ~500 MB
```

#### 2.2 Celery Eager Mode (بدون worker منفصل)

```python
# settings.py

# قبل
CELERY_TASK_ALWAYS_EAGER = False

# بعد
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# التوفير المتوقع: ~200 MB (لا حاجة لـ Celery worker)
```

#### 2.3 تعطيل الميزات

```python
# settings.py

# تعطيل الميزات
ENABLE_GIFT_CARDS = False
ENABLE_DIGITAL_PRODUCTS = False
ENABLE_PREORDERS = False
PRODUCT_RECOMMENDATIONS = False
GENERATE_PRODUCT_THUMBNAILS = False

# حدود GraphQL
GRAPHQL = {
    "query_max_depth": 4,
    "query_max_complexity": 300,
    "pagination_limit": 30,
}

# حدود المنتجات
MAX_PRODUCT_VARIANTS = 0
MAX_PRODUCT_IMAGES = 1

# التوفير المتوقع: ~300 MB
```

#### 2.4 Cache محلي بدلاً من Redis

```python
# settings.py

# قبل (Redis)
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://localhost:6379/2",
    }
}

# بعد (LocMem)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "saleor-cache",
        "OPTIONS": {"MAX_ENTRIES": 500},
    }
}

# التوفير المتوقع: لا حاجة لـ Redis DB 2
```

---

### المرحلة 3: PostgreSQL

#### 3.1 تحسين الذاكرة

```sql
-- postgresql.conf

-- قبل
shared_buffers = 256MB
work_mem = 16MB
max_connections = 100

-- بعد (لـ 2 GB RAM)
shared_buffers = 64MB
work_mem = 2MB
max_connections = 25

-- التوفير المتوقع: ~200 MB
```

#### 3.2 Connection Pooling

```
# استخدام PgBouncer لتقليل الاتصالات

# /etc/pgbouncer/pgbouncer.ini
[databases]
discourse = host=localhost port=5432 dbname=discourse
saleor = host=localhost port=5432 dbname=saleor

[pgbouncer]
pool_mode = transaction
max_client_conn = 50
default_pool_size = 10
```

---

### المرحلة 4: التحسينات العامة

#### 4.1 Swap File

```bash
# إنشاء swap للحالات الحرجة

sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# إضافة لـ /etc/fstab
/swapfile none swap sw 0 0

# تحسين swappiness
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

#### 4.2 OOM Killer Configuration

```bash
# حماية العمليات المهمة من OOM

# PostgreSQL
echo -1000 | sudo tee /proc/$(pgrep -f postgres)/oom_score_adj

# Redis
echo -500 | sudo tee /proc/$(pgrep -f redis-server)/oom_score_adj
```

---

## 5. جدول التحسين

```
┌──────────────────────────────────────────────────────────────────┐
│                    جدول التحسين                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  الأسبوع 1: Discourse                                           │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                   │
│  │ س   │ ح   │ ن   │ ث   │ ر   │ خ   │ ج   │                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                   │
│  │ قياس│ 1.1 │ 1.2 │ 1.3 │ 1.4 │قياس │تقرير│                   │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                   │
│                                                                  │
│  الأسبوع 2: Saleor                                              │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                   │
│  │ س   │ ح   │ ن   │ ث   │ ر   │ خ   │ ج   │                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                   │
│  │ قياس│ 2.1 │ 2.2 │ 2.3 │ 2.4 │قياس │تقرير│                   │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                   │
│                                                                  │
│  الأسبوع 3: PostgreSQL + General                                │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                   │
│  │ س   │ ح   │ ن   │ ث   │ ر   │ خ   │ ج   │                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                   │
│  │ قياس│ 3.1 │ 3.2 │ 4.1 │ 4.2 │قياس │تقرير│                   │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. قائمة التحقق للتحسين

```
┌─────────────────────────────────────────────────────────────────┐
│                    قائمة التحقق                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Discourse                                                      │
│  □ قياس Baseline                                               │
│  □ تقليل Unicorn workers (4→1+threads)                         │
│  □ تقليل Sidekiq concurrency (5→2)                             │
│  □ تعطيل الميزات غير المستخدمة                                 │
│  □ تحديد Redis memory                                          │
│  □ قياس النتيجة                                                │
│                                                                 │
│  Saleor                                                         │
│  □ قياس Baseline                                               │
│  □ تقليل Gunicorn workers (4→1+threads)                        │
│  □ تفعيل Celery Eager mode                                     │
│  □ تعطيل الميزات غير المستخدمة                                 │
│  □ استخدام LocMem cache                                        │
│  □ تحديد GraphQL limits                                        │
│  □ قياس النتيجة                                                │
│                                                                 │
│  PostgreSQL                                                     │
│  □ قياس Baseline                                               │
│  □ تقليل shared_buffers                                        │
│  □ تقليل work_mem                                              │
│  □ تقليل max_connections                                       │
│  □ تثبيت PgBouncer (اختياري)                                   │
│  □ قياس النتيجة                                                │
│                                                                 │
│  General                                                        │
│  □ إنشاء Swap file                                             │
│  □ تكوين OOM killer                                            │
│  □ اختبار الأداء الكامل                                        │
│  □ توثيق النتائج النهائية                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. قرارات التوسع

### علامات الحاجة للزيادة

| العلامة | الحل |
|---------|------|
| Response Time > 3s | زيادة workers/threads |
| Celery Queue > 100 مهمة | تفعيل Celery worker منفصل |
| PG Connections Exhausted | زيادة max_connections |
| Redis OOM errors | زيادة maxmemory |
| Swap Usage > 50% | زيادة RAM أو تقليل الاستهلاك |

### خطة التوسع

```
┌─────────────────────────────────────────────────────────────────┐
│                    خطة التوسع                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  المرحلة 0: Minimum (1.8-2.5 GB)                               │
│  ├── 1 worker + threads لكل تطبيق                              │
│  ├── Celery Eager mode                                         │
│  ├── LocMem cache                                              │
│  └── الخادم: CPX21 ($4/شهر)                                    │
│                                                                 │
│  المرحلة 1: Basic (2.5-3.5 GB)                                 │
│  ├── 2 workers لكل تطبيق                                       │
│  ├── Celery worker منفصل                                       │
│  ├── Redis cache                                               │
│  └── الخادم: CPX31 ($6/شهر)                                    │
│                                                                 │
│  المرحلة 2: Standard (3.5-5 GB)                                │
│  ├── 3-4 workers لكل تطبيق                                     │
│  ├── Celery workers متعددة                                     │
│  ├── Redis cluster                                             │
│  └── الخادم: CPX41 ($8/شهر)                                    │
│                                                                 │
│  المرحلة 3: Full (5+ GB)                                       │
│  ├── Full workers                                              │
│  ├── Elasticsearch                                             │
│  ├── Multi-instance                                            │
│  └── الخادم: CPX51 ($15/شهر) أو أعلى                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. التوثيق النهائي

بعد اكتمال التحسين، سجّل:

```
┌─────────────────────────────────────────────────────────────────┐
│                    التقرير النهائي                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  التاريخ: ___/___/____                                         │
│                                                                 │
│  النتائج:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ المكون          │ قبل        │ بعد        │ التوفير    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Dayf            │ ___ MB     │ ___ MB     │ ___ MB     │   │
│  │ Discourse       │ ___ MB     │ ___ MB     │ ___ MB     │   │
│  │ Saleor          │ ___ MB     │ ___ MB     │ ___ MB     │   │
│  │ PostgreSQL      │ ___ MB     │ ___ MB     │ ___ MB     │   │
│  │ Redis           │ ___ MB     │ ___ MB     │ ___ MB     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ المجموع         │ ___ MB     │ ___ MB     │ ___ MB     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  الميزات المعطلة:                                               │
│  • ___                                                          │
│  • ___                                                          │
│                                                                 │
│  الميزات المفعلة:                                               │
│  • ___                                                          │
│  • ___                                                          │
│                                                                 │
│  الأداء:                                                        │
│  • Response Time: ___ ms (قبل) → ___ ms (بعد)                  │
│  • Throughput: ___ req/s (قبل) → ___ req/s (بعد)              │
│                                                                 │
│  الخادم الموصى: ___                                             │
│  التكلفة الشهرية: $___                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. الصيانة المستمرة

### المهام اليومية

```bash
# فحص سريع
/usr/local/bin/monitor-resources.sh | tail -20
```

### المهام الأسبوعية

```bash
# فحص الذاكرة
free -h

# فحص السجلات
journalctl -u discourse -u saleor --since "1 week ago" | grep -i error

# فحص الأداء
ab -n 100 -c 10 http://localhost:3000/
```

### المهام الشهرية

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade

# تنظيف السجلات
sudo journalctl --vacuum-time=30d

# تحليل الاستهلاك
# مراجعة قرارات التحسين
```

---

## 10. الخلاصة

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ═════════════════════════════════════════════════════════    │
│                   مبادئ التحسين                                 │
│   ═════════════════════════════════════════════════════════    │
│                                                                 │
│   1️⃣ قِيَس قبل وبعد كل تغيير                                   │
│   2️⃣ غيّر شيئاً واحداً في المرة                                │
│   3️⃣ وثّق كل شيء                                               │
│   4️⃣ استعد للتراجع                                             │
│   5️⃣ ابدأ من الأقل وزِد تدريجياً                              │
│   6️⃣ راقب الأداء دائماً                                        │
│   7️⃣ لا تضحِّ بالوظائف من أجل التوفير                         │
│                                                                 │
│   ═════════════════════════════════════════════════════════    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
