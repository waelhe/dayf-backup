# إعداد Saleor

## 1. المتطلبات

### البرمجيات

| البرنامج | الإصدار | ملاحظات |
|----------|---------|---------|
| Python | 3.11+ | عبر pyenv |
| pip | 23+ | يأتي مع Python |
| PostgreSQL | 14+ | محلي |
| Redis | 6.0+ | محلي |
| Node.js | 18+ | للـ Dashboard و Storefront |

### الموارد

| المورد | الحد الأدنى | الموصى |
|--------|------------|--------|
| RAM | 1 GB | 2 GB |
| CPU | 1 core | 2 cores |
| Disk | 5 GB | 10 GB |

---

## 2. التثبيت

### الخطوة 1: تثبيت Python

```bash
# تثبيت pyenv
curl https://pyenv.run | bash
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc
source ~/.bashrc

# تثبيت Python
pyenv install 3.11.4
pyenv global 3.11.4

# تثبيت pipenv
pip install pipenv
```

### الخطوة 2: تحميل Saleor

```bash
# إنشاء مجلد
mkdir -p /var/www/saleor
cd /var/www/saleor

# تحميل Saleor Core
git clone https://github.com/saleor/saleor.git .

# تثبيت المتطلبات
pipenv install --dev
```

### الخطوة 3: إنشاء قاعدة البيانات

```bash
# إنشاء مستخدم
sudo -u postgres psql -c "CREATE USER saleor WITH PASSWORD 'your_password';"

# إنشاء قاعدة البيانات
sudo -u postgres psql -c "CREATE DATABASE saleor OWNER saleor;"

# منح الصلاحيات
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE saleor TO saleor;"
```

### الخطوة 4: تكوين Saleor

```bash
# إنشاء ملف .env
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://saleor:your_password@localhost:5432/saleor

# Redis
REDIS_URL=redis://localhost:6379/2

# Celery
CELERY_BROKER_URL=redis://localhost:6379/2
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# App
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,api.dayf.market,market.dayf.app
DEBUG=False

# Email (disabled initially)
EMAIL_URL=console://

# Media
MEDIA_URL=/media/
STATIC_URL=/static/

# Celery
CELERY_TASK_ALWAYS_EAGER=False

# Permissions
PERMISSIONS_ENABLED=True

# Default currency
DEFAULT_CURRENCY=SAR

# SSO (will configure later)
# EXTERNAL_AUTH_ENABLED=True
# EXTERNAL_AUTH_URL=https://dayf.app/api/auth/external
EOF
```

### الخطوة 5: تشغيل Migrations

```bash
# تطبيق Migrations
pipenv run python manage.py migrate

# إنشاء مستخدم Admin
pipenv run python manage.py createsuperuser

# تحميل البيانات الأولية
pipenv run python manage.py populatedb --createsuperuser
```

### الخطوة 6: تشغيل Saleor

```bash
# تشغيل API Server
pipenv run python manage.py runserver 0.0.0.0:3002

# في نافذة أخرى: تشغيل Celery
pipenv run celery -A saleor worker -l info

# في نافذة أخرى: تشغيل Celery Beat (اختياري)
pipenv run celery -A saleor beat -l info
```

---

## 3. Dashboard (لوحة التحكم)

### التثبيت

```bash
# إنشاء مجلد
mkdir -p /var/www/saleor-dashboard
cd /var/www/saleor-dashboard

# تحميل Dashboard
git clone https://github.com/saleor/saleor-dashboard.git .

# تثبيت المتطلبات
npm install
# أو
yarn install

# تكوين
cp .env.example .env
```

### .env للـ Dashboard

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:3002/graphql/

# App
NEXT_PUBLIC_DEFAULT_LOCALE=ar
NEXT_PUBLIC_DEFAULT_CHANNEL=default-channel
```

### تشغيل Dashboard

```bash
# Development
npm run dev

# Production Build
npm run build
npm run start
```

---

## 4. Storefront (واجهة المتجر)

### التثبيت

```bash
# إنشاء مجلد
mkdir -p /var/www/saleor-storefront
cd /var/www/saleor-storefront

# تحميل Storefront
git clone https://github.com/saleor/react-storefront.git .

# تثبيت المتطلبات
npm install
# أو
yarn install

# تكوين
cp .env.example .env
```

### .env للـ Storefront

```env
# API URL
NEXT_PUBLIC_SALEOR_API_URL=http://localhost:3002/graphql/

# App
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3004
NEXT_PUBLIC_DEFAULT_CHANNEL=default-channel

# Locale
NEXT_PUBLIC_DEFAULT_LOCALE=ar-SA
```

### تشغيل Storefront

```bash
# Development
npm run dev

# Production Build
npm run build
npm run start
```

---

## 5. Systemd Services

### saleor-api.service

```ini
# /etc/systemd/system/saleor-api.service

[Unit]
Description=Saleor API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=saleor
Group=saleor
WorkingDirectory=/var/www/saleor
Environment="PATH=/var/www/saleor/.venv/bin"
ExecStart=/var/www/saleor/.venv/bin/gunicorn saleor.wsgi:application -b 0.0.0.0:3002 -w 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### saleor-celery.service

```ini
# /etc/systemd/system/saleor-celery.service

[Unit]
Description=Saleor Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=saleor
Group=saleor
WorkingDirectory=/var/www/saleor
Environment="PATH=/var/www/saleor/.venv/bin"
ExecStart=/var/www/saleor/.venv/bin/celery -A saleor worker -l info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### saleor-dashboard.service

```ini
# /etc/systemd/system/saleor-dashboard.service

[Unit]
Description=Saleor Dashboard
After=network.target saleor-api.service

[Service]
Type=simple
User=saleor
Group=saleor
WorkingDirectory=/var/www/saleor-dashboard
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### تفعيل الخدمات

```bash
sudo systemctl daemon-reload
sudo systemctl enable saleor-api
sudo systemctl enable saleor-celery
sudo systemctl enable saleor-dashboard
sudo systemctl start saleor-api
sudo systemctl start saleor-celery
sudo systemctl start saleor-dashboard
```

---

## 6. Nginx Configuration

```nginx
# /etc/nginx/sites-available/saleor

upstream saleor_api {
    server 127.0.0.1:3002;
}

upstream saleor_dashboard {
    server 127.0.0.1:3003;
}

upstream saleor_storefront {
    server 127.0.0.1:3004;
}

# GraphQL API
server {
    listen 80;
    server_name api.dayf.market;

    client_max_body_size 10m;

    location / {
        proxy_pass http://saleor_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/saleor/static/;
        expires 30d;
    }

    location /media/ {
        alias /var/www/saleor/media/;
        expires 7d;
    }
}

# Dashboard
server {
    listen 80;
    server_name admin.dayf.market;

    location / {
        proxy_pass http://saleor_dashboard;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Storefront
server {
    listen 80;
    server_name market.dayf.app;

    location / {
        proxy_pass http://saleor_storefront;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. تحسينات الذاكرة

### gunicorn_conf.py

```python
# /var/www/saleor/gunicorn_conf.py

# Single worker + threads (أخف)
workers = 1
threads = 4
worker_class = "gthread"

# Timeout
timeout = 90
keepalive = 5

# Memory management
max_requests = 100
max_requests_jitter = 20

# Bind
bind = "0.0.0.0:3002"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "warning"

# Preload
preload_app = True
```

### تعطيل الميزات

```python
# saleor/settings.py additions

# === الميزات المعطلة ===

# Gift Cards
ENABLE_GIFT_CARDS = False

# Digital Products
ENABLE_DIGITAL_PRODUCTS = False

# Preorders
ENABLE_PREORDERS = False

# Recommendations
PRODUCT_RECOMMENDATIONS = False

# AI Features
OPENAI_API_KEY = None

# Thumbnails
GENERATE_PRODUCT_THUMBNAILS = False

# Multi-language
USE_I18N = False
LANGUAGE_CODE = 'ar'
LANGUAGES = [('ar', 'Arabic')]

# Multi-currency
DEFAULT_CURRENCY = 'SAR'
AVAILABLE_CURRENCIES = ['SAR']

# === الحدود ===

# GraphQL
GRAPHQL = {
    "query_max_depth": 4,
    "query_max_complexity": 300,
    "pagination_limit": 30,
}

# Products
MAX_PRODUCT_VARIANTS = 0
MAX_PRODUCT_IMAGES = 1

# Upload
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024  # 1 MB

# === Celery Eager Mode (للتوفير) ===
CELERY_TASK_ALWAYS_EAGER = True
```

---

## 8. التحقق من التثبيت

```bash
# التحقق من الخدمات
sudo systemctl status saleor-api
sudo systemctl status saleor-celery

# التحقق من GraphQL
curl -X POST http://localhost:3002/graphql/ \
  -H "Content-Type: application/json" \
  -d '{"query": "{ shop { name } }"}'

# التحقق من Dashboard
curl -I http://localhost:3003

# التحقق من قاعدة البيانات
psql -U saleor -d saleor -c "\dt"

# التحقق من Redis
redis-cli -n 2 ping
```

---

## 9. استكشاف الأخطاء

```bash
# المشكلة: خطأ في Migration
# الحل:
pipenv run python manage.py migrate --run-syncdb

# المشكلة: Celery لا يعمل
# الحل:
pipenv run celery -A saleor inspect active

# المشكلة: Dashboard لا يتصل بالـ API
# الحل:
# تحقق من NEXT_PUBLIC_API_URL في .env

# المشكلة: الصور لا تظهر
# الحل:
pipenv run python manage.py collectstatic
```

### السجلات

```bash
# سجلات Saleor
journalctl -u saleor-api -f

# سجلات Celery
journalctl -u saleor-celery -f

# سجلات Dashboard
journalctl -u saleor-dashboard -f
```

---

## 10. الخطوة التالية

بعد إكمال تثبيت Saleor، انتقل إلى:
- [sso-integration.md](./sso-integration.md) - التكامل مع Supabase Auth
- [webhooks.md](./webhooks.md) - التكامل مع Dayf
- [optimization.md](./optimization.md) - تحسين الأداء
