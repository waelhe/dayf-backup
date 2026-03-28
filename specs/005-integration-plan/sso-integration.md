# التكامل عبر SSO (Single Sign-On)

## 1. نظرة عامة

```
┌─────────────────────────────────────────────────────────────────┐
│                    معمارية SSO                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                  Supabase Auth                           │  │
│   │                  (Identity Provider)                     │  │
│   │                                                         │  │
│   │   • User Registration                                   │  │
│   │   • Login/Logout                                        │  │
│   │   • JWT Tokens                                          │  │
│   │   • Session Management                                  │  │
│   │                                                         │  │
│   └────────────────────────┬────────────────────────────────┘  │
│                            │                                    │
│                            │ JWT Token                          │
│                            │                                    │
│          ┌─────────────────┼─────────────────┐                 │
│          │                 │                 │                 │
│          ▼                 ▼                 ▼                 │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐          │
│   │    Dayf    │    │ Discourse  │    │   Saleor   │          │
│   │            │    │            │    │            │          │
│   │ Native     │    │ SSO Plugin │    │ External   │          │
│   │ Supabase   │    │            │    │ Auth       │          │
│   │ Client     │    │            │    |            │          │
│   └────────────┘    └────────────┘    └────────────┘          │
│                                                                 │
│   نفس المستخدم = نفس الهوية في كل الأنظمة                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. SSO مع Discourse

### الطريقة 1: Official SSO Plugin

Discourse يدعم SSO بطريقة passport-sso.

#### الخطوة 1: إنشاء SSO Endpoint في Dayf

```typescript
// src/app/api/sso/discourse/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SSO_SECRET = process.env.DISCOURSE_SSO_SECRET!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sso = searchParams.get('sso');
  const sig = searchParams.get('sig');

  // التحقق من التوقيع
  const expectedSig = crypto
    .createHmac('sha256', SSO_SECRET)
    .update(sso!)
    .digest('hex');

  if (sig !== expectedSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // الحصول على المستخدم الحالي
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    // Redirect to login
    const returnUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?returnUrl=${returnUrl}`
    );
  }

  // التحقق من Token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
  }

  // الحصول على بيانات المستخدم الإضافية
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // فك تشفير nonce
  const decoded = Buffer.from(sso!, 'base64').toString();
  const nonce = new URLSearchParams(decoded).get('nonce');

  // بناء بيانات SSO
  const ssoData = new URLSearchParams({
    nonce: nonce!,
    email: user.email!,
    external_id: user.id,
    username: profile?.username || user.email!.split('@')[0],
    name: profile?.full_name || user.user_metadata?.full_name || '',
    avatar_url: profile?.avatar_url || '',
    bio: profile?.bio || '',
    locale: 'ar',
  });

  // تشفير البيانات
  const payload = Buffer.from(ssoData.toString()).toString('base64');

  // إنشاء التوقيع
  const signature = crypto
    .createHmac('sha256', SSO_SECRET)
    .update(payload)
    .digest('hex');

  // إعادة التوجيه
  const discourseUrl = `${process.env.DISCOURSE_URL}/session/sso_login`;
  const redirectUrl = `${discourseUrl}?sso=${encodeURIComponent(payload)}&sig=${signature}`;

  return NextResponse.redirect(redirectUrl);
}
```

#### الخطوة 2: تكوين Discourse

```yaml
# config/discourse.conf

# SSO Settings
sso_url = https://dayf.app/api/sso/discourse
sso_secret = your_sso_secret_here
sso_overrides_email = true
sso_overrides_username = true
sso_overrides_name = true
sso_overrides_avatar = true
```

### الطريقة 2: OAuth2 Provider (بديل)

```typescript
// src/app/api/oauth/authorize/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const client_id = searchParams.get('client_id');
  const redirect_uri = searchParams.get('redirect_uri');
  const response_type = searchParams.get('response_type');
  const state = searchParams.get('state');

  // Validate client
  if (client_id !== 'discourse' && client_id !== 'saleor') {
    return NextResponse.json({ error: 'Invalid client' }, { status: 400 });
  }

  // Check if user is logged in
  // If not, redirect to login
  // If yes, generate code and redirect

  const code = generateRandomCode();
  
  // Store code in Redis with short expiry
  await redis.set(`oauth_code:${code}`, JSON.stringify({
    client_id,
    user_id: currentUser.id,
    created_at: Date.now(),
  }), 'EX', 300);

  return NextResponse.redirect(
    `${redirect_uri}?code=${code}&state=${state}`
  );
}

// src/app/api/oauth/token/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code, client_id, client_secret, grant_type } = body;

  if (grant_type !== 'authorization_code') {
    return NextResponse.json({ error: 'Invalid grant type' }, { status: 400 });
  }

  // Validate code
  const codeData = await redis.get(`oauth_code:${code}`);
  if (!codeData) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  // Delete code (one-time use)
  await redis.del(`oauth_code:${code}`);

  // Return tokens
  return NextResponse.json({
    access_token: generateAccessToken(codeData.user_id),
    token_type: 'Bearer',
    expires_in: 3600,
  });
}
```

---

## 3. SSO مع Saleor

### External Authentication Plugin

```python
# saleor/plugins/external_auth/plugin.py

from saleor.plugins.base_plugin import BasePlugin
from saleor.account.models import User

class SupabaseAuthPlugin(BasePlugin):
    PLUGIN_ID = "supabase.auth"
    PLUGIN_NAME = "Supabase Authentication"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.sso_url = self.configuration.get("sso_url")
        self.sso_secret = self.configuration.get("sso_secret")
    
    def external_authenticate(self, token):
        """
        Verify JWT token from Supabase
        """
        import jwt
        import requests
        
        # Option 1: Verify with Supabase
        response = requests.get(
            f"{self.supabase_url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            return None
        
        user_data = response.json()
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                'first_name': user_data.get('user_metadata', {}).get('full_name', ''),
                'is_active': True,
            }
        )
        
        return user
    
    def get_user_from_token(self, token):
        """
        Called on each authenticated request
        """
        return self.external_authenticate(token)
```

### تكوين Saleor

```python
# saleor/settings.py

# External Auth
EXTERNAL_AUTH_ENABLED = True
EXTERNAL_AUTH_PLUGIN = "saleor.plugins.supabase_auth.SupabaseAuthPlugin"

# Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
```

### Middleware للـ JWT

```python
# saleor/middleware/supabase_auth.py

import jwt
from django.contrib.auth.models import AnonymousUser
from saleor.account.models import User

class SupabaseAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check for Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
            try:
                # Verify JWT
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=['HS256'],
                    audience='authenticated'
                )
                
                # Get or create user
                user, _ = User.objects.get_or_create(
                    email=payload['email'],
                    defaults={
                        'first_name': payload.get('user_metadata', {}).get('full_name', ''),
                    }
                )
                request.user = user
                
            except jwt.InvalidTokenError:
                request.user = AnonymousUser()
        
        return self.get_response(request)
```

---

## 4. JWT Token Structure

### Supabase JWT

```json
{
  "aud": "authenticated",
  "exp": 1234567890,
  "sub": "user-uuid",
  "email": "user@example.com",
  "phone": "+966...",
  "app_metadata": {
    "provider": "email",
    "roles": ["user"]
  },
  "user_metadata": {
    "full_name": "أحمد محمد",
    "avatar_url": "https://..."
  },
  "role": "authenticated"
}
```

---

## 5. Flow الكامل

```
┌──────────────────────────────────────────────────────────────────┐
│                    SSO Flow الكامل                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1️⃣ تسجيل الدخول في Dayf                                        │
│  ────────────────────────────                                    │
│                                                                  │
│  User → Dayf Login → Supabase Auth → JWT Token                   │
│                                                                  │
│  ┌──────┐      ┌──────┐      ┌──────────┐      ┌──────────┐     │
│  │ User │──►  │ Dayf │──►  │ Supabase │──►  │ JWT Token │     │
│  │      │      │Login │      │   Auth   │      │          │     │
│  └──────┘      └──────┘      └──────────┘      └──────────┘     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  2️⃣ الوصول لـ Discourse                                         │
│  ─────────────────────────                                       │
│                                                                  │
│  User → Discourse → SSO Redirect → Dayf → Verify → Return       │
│                                                                  │
│  ┌──────┐      ┌──────────┐      ┌──────┐      ┌──────┐        │
│  │ User │──►  │Discourse │──►  │ Dayf │──►  │Verify │        │
│  │      │      │(no auth)│      │ SSO  │      │Token │        │
│  └──────┘      └──────────┘      └──────┘      └──────┘        │
│                     │                               │            │
│                     │         ┌─────────────────────┘            │
│                     │         │                                  │
│                     ▼         ▼                                  │
│                ┌──────────────────┐                             │
│                │    Logged In     │                             │
│                │   Same User      │                             │
│                └──────────────────┘                             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  3️⃣ الوصول لـ Saleor                                            │
│  ─────────────────────                                           │
│                                                                  │
│  User → Saleor API → JWT in Header → Verify → Access            │
│                                                                  │
│  ┌──────┐      ┌──────────┐                                    │
│  │ User │──►  │  Saleor  │                                    │
│  │      │      │   API    │                                    │
│  └──────┘      └──────────┘                                    │
│       │              │                                          │
│       │ JWT Token    │                                          │
│       │ in Header    │                                          │
│       │              │                                          │
│       │              ▼                                          │
│       │       ┌──────────────┐                                  │
│       └──────►│   Verify     │                                  │
│               │   JWT        │                                  │
│               └──────────────┘                                  │
│                      │                                          │
│                      ▼                                          │
│               ┌──────────────┐                                  │
│               │   Access     │                                  │
│               │   Granted    │                                  │
│               └──────────────┘                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. اختبار SSO

### اختبار Discourse SSO

```bash
# 1. تسجيل الدخول في Dayf
curl -X POST https://dayf.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. زيارة Discourse (يجب أن يكون مسجل دخول تلقائياً)
curl -I https://community.dayf.app/session/sso

# 3. التحقق من المستخدم
curl https://community.dayf.app/session/current.json \
  -H "Cookie: <session_cookie>"
```

### اختبار Saleor Auth

```bash
# 1. الحصول على Token من Supabase
TOKEN=$(curl -X POST https://xxx.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.access_token')

# 2. استخدام Token مع Saleor
curl -X POST https://api.dayf.market/graphql/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ me { email } }"}'
```

---

## 7. الأمان

### أفضل الممارسات

```
┌─────────────────────────────────────────────────────────────────┐
│                    أمان SSO                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ استخدم HTTPS دائماً                                         │
│  ✅ تحقق من توقيع JWT                                           │
│  ✅ تحقق من تاريخ انتهاء Token                                  │
│  ✅ استخدم state parameter في OAuth                            │
│  ✅ لا ترسل Token في URL                                        │
│  ✅ استخدم httpOnly cookies للـ session                        │
│  ✅ حدد صلاحيات Token بوضوح                                     │
│                                                                 │
│  ❌ لا تخزن Token في localStorage (للعمليات الحساسة)            │
│  ❌ لا ترسل Token في GET requests                               │
│  ❌ لا تستخدم نفس Secret لكل الأنظمة                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables

```env
# Dayf
DISCOURSE_SSO_SECRET=random_64_char_string
DISCOURSE_URL=https://community.dayf.app

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your_jwt_secret

# Saleor
SALEOR_JWT_SECRET=same_as_supabase_or_different
```

---

## 8. الخطوة التالية

- [webhooks.md](./webhooks.md) - التكامل عبر Webhooks
- [optimization.md](./optimization.md) - تحسين الأداء
