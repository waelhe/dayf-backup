# مهام التنفيذ: تكامل Discourse + Saleor
**المدخلات:** spec.md + plan.md
**الأولوية:** P1 → P2 → P3

---

## الترميز
- [P] = يعمل بالتوازي مع غيره
- [US1/2/3] = قصة المستخدم
- 🔴 = يمنع ما بعده (blocking)
- ✅ = مكتمل
- ⏳ = قيد التنفيذ
- ⬜ = لم يبدأ

---

## Phase 0 — التحقق من البيئة (Blocking 🔴)

> لا يبدأ أي شيء قبل اكتمال هذه المرحلة

- [ ] T001 🔴 التحقق من المتطلبات الأساسية
  ```bash
  # التحقق من Python
  python3 --version  # يجب 3.10+
  # التحقق من Node
  node --version     # يجب 18+
  # التحقق من المساحة
  df -h              # يجب 10GB+ فارغة
  ```

- [ ] T002 🔴 قراءة الوثائق المرجعية
  - قراءة constitution.md ✅
  - قراءة rules/RULES.md ✅
  - قراءة systems/SYSTEMS.md ✅
  - قراءة decisions/DECISIONS.md ✅

**Checkpoint:** البيئة جاهزة، الدستور مفهوم

---

## Phase 1 — البنية التحتية المحلية (Blocking 🔴)

### 1.1 PostgreSQL

- [ ] T003 🔴 [P] تثبيت PostgreSQL
  ```bash
  sudo apt update
  sudo apt install -y postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
  ```

- [ ] T004 🔴 [P] إنشاء databases
  ```bash
  sudo -u postgres createuser discourse -P
  sudo -u postgres createdb discourse -O discourse
  sudo -u postgres createuser saleor -P
  sudo -u postgres createdb saleor -O saleor
  ```

- [ ] T005 🔴 [P] اختبار الاتصال
  ```bash
  psql -U discourse -d discourse -h localhost -c "SELECT 1;"
  psql -U saleor -d saleor -h localhost -c "SELECT 1;"
  ```

### 1.2 Redis

- [ ] T006 🔴 [P] تثبيت Redis
  ```bash
  sudo apt install -y redis-server
  sudo systemctl start redis
  sudo systemctl enable redis
  ```

- [ ] T007 🔴 [P] اختبار Redis
  ```bash
  redis-cli ping
  # يجب أن يرجع: PONG
  ```

**Checkpoint:** PostgreSQL + Redis يعملان ✅

---

## Phase 2 — Discourse (P1: منتدى المجتمع)

### 2.1 Ruby Environment

- [ ] T008 ⬜ تثبيت rbenv
  ```bash
  git clone https://github.com/rbenv/rbenv.git ~/.rbenv
  echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
  echo 'eval "$(rbenv init -)"' >> ~/.bashrc
  source ~/.bashrc
  ```

- [ ] T009 ⬜ تثبيت ruby-build
  ```bash
  git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build
  ```

- [ ] T010 ⬜ تثبيت Ruby 3.2
  ```bash
  rbenv install 3.2.0
  rbenv global 3.2.0
  gem install bundler
  ```

### 2.2 Discourse Installation

- [ ] T011 ⬜ تحميل Discourse
  ```bash
  git clone https://github.com/discourse/discourse.git ~/discourse
  cd ~/discourse
  bundle install
  ```

- [ ] T012 ⬜ تكوين قاعدة البيانات
  ```bash
  cp config/discourse_defaults.conf config/discourse.conf
  # تعديل db_host, db_name, db_username, db_password
  ```

- [ ] T013 ⬜ تكوين Redis
  ```bash
  # تعديل redis_host في config/discourse.conf
  ```

- [ ] T014 ⬜ تهيئة قاعدة البيانات
  ```bash
  cd ~/discourse
  bundle exec rake db:migrate
  bundle exec rake assets:precompile
  ```

### 2.3 تشغيل Discourse

- [ ] T015 ⬜ تشغيل الخادم
  ```bash
  bundle exec rails server -p 3001 -b 0.0.0.0
  ```

- [ ] T016 ⬜ تشغيل Sidekiq (في terminal منفصل)
  ```bash
  bundle exec sidekiq
  ```

- [ ] T017 ⬜ اختبار الوصول
  ```bash
  curl http://localhost:3001
  # يجب أن يرجع HTML
  ```

### 2.4 قياس الاستهلاك

- [ ] T018 ⬜ قياس الذاكرة
  ```bash
  ps aux | grep -E "ruby|rails|sidekiq" | awk '{sum+=$6} END {print sum/1024 " MB"}'
  ```

**Checkpoint:** Discourse يعمل على localhost:3001 ✅

---

## Phase 3 — Saleor (P2: السوق الإلكتروني)

### 3.1 Python Environment

- [ ] T019 ⬜ تثبيت pyenv
  ```bash
  curl https://pyenv.run | bash
  echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
  echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
  source ~/.bashrc
  ```

- [ ] T020 ⬜ تثبيت Python 3.11
  ```bash
  pyenv install 3.11
  pyenv global 3.11
  pip install pipenv
  ```

### 3.2 Saleor Core Installation

- [ ] T021 ⬜ تحميل Saleor
  ```bash
  git clone https://github.com/saleor/saleor.git ~/saleor
  cd ~/saleor
  pipenv install --dev
  ```

- [ ] T022 ⬜ تكوين قاعدة البيانات
  ```bash
  cp saleor/settings.py saleor/settings_local.py
  # تعديل DATABASES في settings_local.py
  ```

- [ ] T023 ⬜ تكوين Redis
  ```bash
  # تعديل CACHES في settings_local.py
  ```

- [ ] T024 ⬜ تهيئة قاعدة البيانات
  ```bash
  cd ~/saleor
  pipenv run python manage.py migrate
  pipenv run python manage.py populatedb
  ```

### 3.3 تشغيل Saleor

- [ ] T025 ⬜ تشغيل API Server
  ```bash
  pipenv run python manage.py runserver 0.0.0.0:3002
  ```

- [ ] T026 ⬜ تشغيل Dashboard (منفصل)
  ```bash
  git clone https://github.com/saleor/saleor-dashboard.git ~/saleor-dashboard
  cd ~/saleor-dashboard
  npm install
  npm start -- -p 3003
  ```

- [ ] T027 ⬜ اختبار GraphQL API
  ```bash
  curl -X POST http://localhost:3002/graphql/ \
    -H "Content-Type: application/json" \
    -d '{"query": "{ shop { name } }"}'
  ```

### 3.4 قياس الاستهلاك

- [ ] T028 ⬜ قياس الذاكرة
  ```bash
  ps aux | grep -E "python|gunicorn|celery" | awk '{sum+=$6} END {print sum/1024 " MB"}'
  ```

**Checkpoint:** Saleor يعمل على localhost:3002 + Dashboard على :3003 ✅

---

## Phase 4 — SSO Integration (P3)

### 4.1 Supabase Auth Setup

- [ ] T029 ⬜ إنشاء SSO endpoint في Dayf
  - ملف: `src/app/api/sso/discourse/route.ts`
  - التحقق من JWT token
  - إرجاع بيانات المستخدم

- [ ] T030 ⬜ تكوين Discourse SSO
  - تعديل `config/discourse.conf`
  - إضافة sso_url و sso_secret

- [ ] T031 ⬜ تكوين Saleor External Auth
  - إنشاء plugin للـ Supabase Auth
  - ربط مع JWT verification

### 4.2 Webhooks Setup

- [ ] T032 ⬜ [P] Webhook: Saleor → Dayf (Orders)
  - إنشاء endpoint في Dayf
  - تكوين Saleor webhook

- [ ] T033 ⬜ [P] Webhook: Discourse → Dayf (Topics/Replies)
  - إنشاء endpoint في Dayf
  - تكوين Discourse webhook

- [ ] T034 ⬜ اختبار SSO
  ```bash
  # تسجيل دخول في Dayf
  # زيارة localhost:3001 (Discourse)
  # يجب أن يكون مسجلاً تلقائياً
  # زيارة localhost:3002 (Saleor)
  # يجب أن يكون مسجلاً تلقائياً
  ```

**Checkpoint:** SSO يعمل عبر الأنظمة الثلاثة ✅

---

## Phase 5 — التحسين التدريجي

### 5.1 Discourse Optimization

- [ ] T035 ⬜ تقليل Unicorn Workers
  ```ruby
  # config/unicorn.conf.rb
  workers = 1
  threads = 4
  ```

- [ ] T036 ⬜ تقليل Sidekiq Concurrency
  ```yaml
  # config/sidekiq.yml
  :concurrency: 2
  ```

- [ ] T037 ⬜ تعطيل ميزات غير مستخدمة
  ```yaml
  # config/settings.yml
  enable_user_directory: false
  enable_s3_uploads: false
  ```

### 5.2 Saleor Optimization

- [ ] T038 ⬜ تقليل Gunicorn Workers
  ```python
  # gunicorn_conf.py
  workers = 1
  threads = 4
  worker_class = "gthread"
  ```

- [ ] T039 ⬜ تفعيل Celery Eager Mode
  ```python
  # settings.py
  CELERY_TASK_ALWAYS_EAGER = True
  ```

- [ ] T040 ⬜ تعطيل ميزات غير مستخدمة
  ```python
  ENABLE_GIFT_CARDS = False
  ENABLE_DIGITAL_PRODUCTS = False
  ```

### 5.3 PostgreSQL Optimization

- [ ] T041 ⬜ تحسين الإعدادات
  ```sql
  -- postgresql.conf
  shared_buffers = 64MB
  work_mem = 2MB
  max_connections = 25
  ```

### 5.4 قياس النتائج

- [ ] T042 ⬜ قياس الاستهلاك النهائي
  ```bash
  free -h
  ps aux --sort=-%mem | head -20
  ```

- [ ] T043 ⬜ توثيق النتائج في STATUS.md

**Checkpoint:** التحسين مكتمل، الاستهلاك أقل من 2.5 GB ✅

---

## Phase 6 — التوثيق والنشر

- [ ] T044 ⬜ [P] تحديث STATUS.md
- [ ] T045 ⬜ [P] تحديث DECISIONS.md
- [ ] T046 ⬜ [P] تحديث SYSTEMS.md
- [ ] T047 ⬜ إنشاء systemd services (اختياري)
- [ ] T048 ⬜ إنشاء monitoring script

---

## الفرص المتوازية

```
بعد Phase 1:
  Developer A → Phase 2 (Discourse)
  Developer B → Phase 3 (Saleor)
  يندمجان في Phase 4 (SSO)

بعد Phase 4:
  Developer A → Phase 5.1 (Discourse Optimization)
  Developer B → Phase 5.2 (Saleor Optimization)
  يندمجان في Phase 6
```

---

## نقاط التوقف للتحقق

1. **بعد T007:** PostgreSQL + Redis يعملان؟
2. **بعد T017:** Discourse يعمل؟
3. **بعد T027:** Saleor يعمل؟
4. **بعد T034:** SSO يعمل؟
5. **بعد T043:** التحسين فعّال؟

---

## 🚨 قائمة التحقق قبل كل commit

```
□ لا يوجد any
□ لا يوجد console.log
□ كل API input مُتحقق منه
□ الأخطاء مُعالجة
□ STATUS.md محدّث
□ لا استدعاء مباشر بين modules (Events/Webhooks فقط)
```
