# إعداد Discourse

## 1. المتطلبات

### البرمجيات

| البرنامج | الإصدار | ملاحظات |
|----------|---------|---------|
| Ruby | 3.2+ | عبر rbenv أو rvm |
| Rails | 7.0+ | يُثبت تلقائياً |
| PostgreSQL | 14+ | محلي |
| Redis | 6.0+ | محلي |
| Bundler | 2.4+ | gem install bundler |
| Node.js | 18+ | للأصول |
| Yarn | 1.22+ | npm install -g yarn |

### الموارد

| المورد | الحد الأدنى | الموصى |
|--------|------------|--------|
| RAM | 1 GB | 2 GB |
| CPU | 1 core | 2 cores |
| Disk | 10 GB | 20 GB |

---

## 2. التثبيت

### الخطوة 1: تثبيت Ruby

```bash
# تثبيت rbenv
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
source ~/.bashrc

# تثبيت ruby-build
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

# تثبيت Ruby
rbenv install 3.2.2
rbenv global 3.2.2

# تثبيت Bundler
gem install bundler
```

### الخطوة 2: تحميل Discourse

```bash
# إنشاء مجلد
mkdir -p /var/www/discourse
cd /var/www/discourse

# تحميل الكود
git clone https://github.com/discourse/discourse.git .

# تثبيت Gems
bundle install

# تثبيت الأصول
yarn install
```

### الخطوة 3: إنشاء قاعدة البيانات

```bash
# إنشاء مستخدم
sudo -u postgres psql -c "CREATE USER discourse WITH PASSWORD 'your_password';"

# إنشاء قاعدة البيانات
sudo -u postgres psql -c "CREATE DATABASE discourse OWNER discourse;"

# منح الصلاحيات
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE discourse TO discourse;"

# تثبيت extensions
sudo -u postgres psql -d discourse -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
sudo -u postgres psql -d discourse -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
sudo -u postgres psql -d discourse -c "CREATE EXTENSION IF NOT EXISTS hstore;"
```

### الخطوة 4: تكوين Discourse

```bash
# نسخ ملف التكوين
cp config/discourse_defaults.conf config/discourse.conf

# تعديل الإعدادات
nano config/discourse.conf
```

```conf
# config/discourse.conf

# === قاعدة البيانات ===
db_host = localhost
db_port = 5432
db_name = discourse
db_username = discourse
db_password = your_password

# === Redis ===
redis_host = localhost
redis_port = 6379
redis_db = 1

# === التطبيق ===
hostname = community.dayf.app
developer_emails = admin@dayf.app
notification_email = noreply@dayf.app

# === المنفذ ===
port = 3001
bind_address = 0.0.0.0

# === SSO (سيُعد لاحقاً) ===
# sso_url = https://dayf.app/api/sso
# sso_secret = your_sso_secret
```

### الخطوة 5: تشغيل Migrations

```bash
# إنشاء الجداول
RAILS_ENV=production bundle exec rails db:migrate

# إنشاء بيانات أولية
RAILS_ENV=production bundle exec rails assets:precompile
```

### الخطوة 6: تشغيل Discourse

```bash
# تشغيل الخادم
RAILS_ENV=production bundle exec rails server -p 3001 -b 0.0.0.0

# في نافذة أخرى: تشغيل Sidekiq
RAILS_ENV=production bundle exec sidekiq
```

---

## 3. Systemd Service

### discourse.service

```ini
# /etc/systemd/system/discourse.service

[Unit]
Description=Discourse Forum
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=discourse
Group=discourse
WorkingDirectory=/var/www/discourse
Environment="RAILS_ENV=production"
ExecStart=/home/discourse/.rbenv/shims/bundle exec rails server -p 3001 -b 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### discourse-sidekiq.service

```ini
# /etc/systemd/system/discourse-sidekiq.service

[Unit]
Description=Discourse Sidekiq
After=network.target redis.service

[Service]
Type=simple
User=discourse
Group=discourse
WorkingDirectory=/var/www/discourse
Environment="RAILS_ENV=production"
ExecStart=/home/discourse/.rbenv/shims/bundle exec sidekiq
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### تفعيل الخدمات

```bash
sudo systemctl daemon-reload
sudo systemctl enable discourse
sudo systemctl enable discourse-sidekiq
sudo systemctl start discourse
sudo systemctl start discourse-sidekiq
```

---

## 4. Nginx Configuration

```nginx
# /etc/nginx/sites-available/discourse

upstream discourse {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name community.dayf.app;

    client_max_body_size 10m;

    location / {
        proxy_pass http://discourse;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /uploads/ {
        alias /var/www/discourse/public/uploads/;
        expires 30d;
    }

    location /assets/ {
        alias /var/www/discourse/public/assets/;
        expires 30d;
    }
}
```

---

## 5. تحسينات الذاكرة

### المرحلة 0: الحد الأدنى

```ruby
# config/unicorn.conf.rb

worker_processes 1
threads_count 2

# Memory limit
preload_app true
check_client_connection false

before_fork do |server, worker|
  defined?(ActiveRecord::Base) and ActiveRecord::Base.connection.disconnect!
  defined?(Redis) and Redis.current.disconnect! if defined?(Redis.current)
  GC.start
end

after_fork do |server, worker|
  defined?(ActiveRecord::Base) and ActiveRecord::Base.establish_connection
  defined?(Redis) and Redis.current = Redis.new
end
```

### تعطيل الميزات غير الضرورية

```yaml
# config/settings.yml

# تعطيل الميزات
enable_user_directory: false
enable_mobile_theme: true  # أبقيه لضيف
enable_s3_uploads: false
enable_s3_inventory: false

# تقليل الحدود
max_topics_per_day: 10
max_posts_per_day: 50
max_invites_per_day: 5

# تقليل Jobs
polling_interval: 60  # بدلاً من 30
```

---

## 6. التحقق من التثبيت

```bash
# التحقق من الخدمة
sudo systemctl status discourse
sudo systemctl status discourse-sidekiq

# التحقق من الاستجابة
curl -I http://localhost:3001

# التحقق من قاعدة البيانات
psql -U discourse -d discourse -c "\dt"

# التحقق من Redis
redis-cli -n 1 ping
```

---

## 7. استكشاف الأخطاء

### مشاكل شائعة

```bash
# المشكلة: خطأ في الاتصال بـ PostgreSQL
# الحل:
sudo -u postgres psql -c "ALTER USER discourse WITH PASSWORD 'new_password';"
# ثم تحديث config/discourse.conf

# المشكلة: خطأ في الاتصال بـ Redis
# الحل:
redis-cli ping
sudo systemctl restart redis

# المشكلة: Sidekiq لا يعمل
# الحل:
RAILS_ENV=production bundle exec sidekiq -v

# المشكلة: الأصول لا تظهر
# الحل:
RAILS_ENV=production bundle exec rails assets:precompile
RAILS_ENV=production bundle exec rails assets:clean
```

### السجلات

```bash
# سجلات Discourse
tail -f /var/www/discourse/log/production.log

# سجلات Sidekiq
tail -f /var/www/discourse/log/sidekiq.log

# سجلات النظام
journalctl -u discourse -f
journalctl -u discourse-sidekiq -f
```

---

## 8. الخطوة التالية

بعد إكمال تثبيت Discourse، انتقل إلى:
- [sso-integration.md](./sso-integration.md) - التكامل مع Supabase Auth
- [optimization.md](./optimization.md) - تحسين الأداء
