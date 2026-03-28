# Cloud Hosting Pricing Research - Dayf Platform

## Research Date: March 2025
## Purpose: Syrian Tourism Platform (Dayf) Deployment Planning

---

# 1. DIGITALOCEAN DROPLET PRICING

## Basic Droplets (Regular/Standard)

| RAM | vCPUs | Storage | Bandwidth | Monthly | Hourly |
|-----|-------|---------|-----------|---------|--------|
| 512 MB | 1 | 10 GB SSD | 500 GB | $4 | $0.006 |
| 1 GB | 1 | 25 GB SSD | 1 TB | $6 | $0.009 |
| 2 GB | 1 | 50 GB SSD | 2 TB | $12 | $0.018 |
| 2 GB | 2 | 60 GB SSD | 3 TB | $18 | $0.027 |
| 4 GB | 2 | 80 GB SSD | 4 TB | $24 | $0.036 |
| 8 GB | 4 | 160 GB SSD | 5 TB | $48 | $0.071 |

## General Purpose Droplets (Premium Intel/AMD)

| RAM | vCPUs | Storage | Bandwidth | Monthly | Hourly |
|-----|-------|---------|-----------|---------|--------|
| 2 GB | 1 | 25 GB SSD | 2 TB | $15 | $0.022 |
| 4 GB | 2 | 50 GB SSD | 4 TB | $30 | $0.045 |
| 8 GB | 2 | 100 GB SSD | 5 TB | $60 | $0.089 |
| 8 GB | 4 | 150 GB SSD | 6 TB | $90 | $0.134 |
| 16 GB | 4 | 200 GB SSD | 7 TB | $120 | $0.179 |
| 16 GB | 6 | 300 GB SSD | 8 TB | $180 | $0.268 |
| 32 GB | 8 | 400 GB SSD | 9 TB | $240 | $0.357 |

## CPU-Optimized Droplets

| RAM | vCPUs | Storage | Bandwidth | Monthly | Hourly |
|-----|-------|---------|-----------|---------|--------|
| 2 GB | 1 | 25 GB SSD | 2 TB | $18 | $0.027 |
| 4 GB | 2 | 50 GB SSD | 4 TB | $36 | $0.054 |
| 8 GB | 4 | 100 GB SSD | 5 TB | $72 | $0.107 |
| 16 GB | 6 | 200 GB SSD | 6 TB | $144 | $0.214 |
| 16 GB | 8 | 250 GB SSD | 7 TB | $192 | $0.286 |
| 32 GB | 12 | 400 GB SSD | 9 TB | $288 | $0.429 |
| 64 GB | 16 | 600 GB SSD | 10 TB | $576 | $0.857 |

## Memory-Optimized Droplets

| RAM | vCPUs | Storage | Bandwidth | Monthly | Hourly |
|-----|-------|---------|-----------|---------|--------|
| 8 GB | 2 | 50 GB SSD | 3 TB | $48 | $0.071 |
| 16 GB | 4 | 100 GB SSD | 4 TB | $96 | $0.143 |
| 32 GB | 4 | 150 GB SSD | 5 TB | $168 | $0.250 |
| 32 GB | 8 | 200 GB SSD | 6 TB | $240 | $0.357 |
| 64 GB | 8 | 300 GB SSD | 7 TB | $384 | $0.571 |
| 64 GB | 16 | 400 GB SSD | 8 TB | $512 | $0.762 |
| 128 GB | 16 | 600 GB SSD | 10 TB | $896 | $1.333 |

---

# 2. ADDITIONAL DIGITALOCEAN SERVICES

## Managed PostgreSQL

| Plan | vCPUs | RAM | Storage | Connections | Monthly |
|------|-------|-----|---------|-------------|---------|
| Basic-1 | Shared | 1 GB | 10 GB | 45 | $15 |
| Basic-2 | Shared | 2 GB | 25 GB | 100 | $30 |
| Basic-4 | Shared | 4 GB | 50 GB | 200 | $60 |
| Basic-8 | Shared | 8 GB | 100 GB | 400 | $120 |
| Pro-2 | 2 | 4 GB | 100 GB | 500 | $175 |
| Pro-4 | 4 | 8 GB | 200 GB | 1000 | $350 |
| Pro-8 | 8 | 16 GB | 400 GB | 2000 | $700 |

**Features included:**
- Automated backups (7-day retention)
- Point-in-time recovery
- Standby nodes (Pro plans)
- Connection pooling (PgBouncer)

## Managed Redis

| Plan | RAM | Max Connections | Monthly |
|------|-----|-----------------|---------|
| Basic-1 | 1 GB | 250 | $15 |
| Basic-2 | 2 GB | 500 | $30 |
| Basic-4 | 4 GB | 1000 | $60 |
| Basic-8 | 8 GB | 2000 | $120 |
| Pro-2 | 4 GB | 1000 | $175 |
| Pro-4 | 8 GB | 2000 | $350 |

## Spaces (S3-Compatible Object Storage)

| Plan | Storage | Bandwidth | Monthly |
|------|---------|-----------|---------|
| Starter | 250 GB | 1 TB | $5 |
| Standard | 1 TB | 10 TB | $20 |
| Pro | 10 TB | 50 TB | $180 |

**Overages:** $0.02/GB storage, $0.01/GB bandwidth

## Load Balancers

| Type | Monthly | Features |
|------|---------|----------|
| Basic | $12 | 10,000 RPS, SSL termination |
| Starter | $18 | 10,000 RPS, Advanced routing |
| Standard | $25 | 20,000 RPS, Full features |

---

# 3. COMPETITOR PRICING COMPARISON

## Hetzner Cloud (CPX Series - AMD)

| RAM | vCPUs | Storage | Bandwidth | Monthly |
|-----|-------|---------|-----------|---------|
| 2 GB | 2 | 40 GB | 20 TB | €3.29 (~$3.60) |
| 4 GB | 2 | 80 GB | 20 TB | €6.27 (~$6.90) |
| 8 GB | 4 | 160 GB | 20 TB | €12.20 (~$13.40) |
| 16 GB | 4 | 240 GB | 20 TB | €24.37 (~$26.80) |
| 32 GB | 8 | 360 GB | 20 TB | €46.50 (~$51.15) |
| 64 GB | 16 | 600 GB | 20 TB | €90.18 (~$99.20) |

**Hetzner Dedicated (AX Series):**
| RAM | CPUs | Storage | Monthly |
|-----|------|---------|---------|
| 16 GB | 4 cores | 2x256 NVMe | €21.28 (~$23.40) |
| 32 GB | 6 cores | 2x512 NVMe | €38.21 (~$42.00) |
| 64 GB | 8 cores | 2x512 NVMe | €53.60 (~$59.00) |

## Contabo VPS

| RAM | vCPUs | Storage | Bandwidth | Monthly |
|-----|-------|---------|-----------|---------|
| 8 GB | 4 | 50 GB NVMe | 32 TB | €4.99 (~$5.50) |
| 16 GB | 6 | 100 GB NVMe | 32 TB | €8.99 (~$9.90) |
| 32 GB | 8 | 200 GB NVMe | 32 TB | €17.99 (~$19.80) |
| 64 GB | 16 | 400 GB NVMe | 32 TB | €35.99 (~$39.60) |

**Contabo VDS (Dedicated Resources):**
| RAM | vCPUs | Storage | Monthly |
|-----|-------|---------|---------|
| 16 GB | 4 | 200 GB | €19.99 (~$22) |
| 32 GB | 8 | 400 GB | €39.99 (~$44) |
| 64 GB | 16 | 800 GB | €79.99 (~$88) |

## Railway (PaaS - Pay-per-use)

| Resource | Price |
|----------|-------|
| vCPU | $0.000463/vCPU-minute (~$20/month per vCPU) |
| Memory | $0.000231/GB-minute (~$10/month per GB) |
| Storage | $0.0001/MB (~$0.10/GB/month) |
| Database (Postgres) | $5/GB/month |
| Database (Redis) | $1/GB/month |

**Estimated Monthly for Different Sizes:**
| Config | Estimated Monthly |
|--------|-------------------|
| 1 vCPU + 1 GB RAM + 1 GB DB | ~$35 |
| 2 vCPU + 2 GB RAM + 5 GB DB | ~$90 |
| 4 vCPU + 4 GB RAM + 10 GB DB | ~$180 |
| 4 vCPU + 8 GB RAM + 20 GB DB | ~$260 |

## Render (PaaS)

| Service Type | Spec | Monthly |
|--------------|------|---------|
| Web Service (Starter) | 512 MB | $7 |
| Web Service (Standard) | 2 GB | $25 |
| Web Service (Pro) | 4 GB | $85 |
| Web Service (Pro+) | 8 GB | $170 |
| Postgres (Starter) | 1 GB | $7 |
| Postgres (Standard) | 10 GB | $20 |
| Postgres (Pro) | 50 GB | $80 |
| Redis (Starter) | 25 MB | Free |
| Redis (Standard) | 1 GB | $10 |

---

# 4. RECOMMENDATIONS FOR DAYF PLATFORM

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DAYF PLATFORM                            │
├─────────────────────────────────────────────────────────────┤
│  Services:                                                   │
│  ├── Next.js App (Dayf Main)                                │
│  ├── MedusaJS (E-commerce backend)                          │
│  ├── Saleor (Headless commerce alternative)                 │
│  └── Dayf API Services                                       │
│                                                              │
│  Data:                                                       │
│  ├── PostgreSQL (Supabase/Managed)                          │
│  ├── Redis (Cache/Queue)                                    │
│  └── Object Storage (Images, Documents)                     │
└─────────────────────────────────────────────────────────────┘
```

## Option A: MedusaJS Minimal Setup

### Requirements:
- Node.js runtime
- PostgreSQL database
- Redis (optional but recommended)
- 1-2 GB RAM minimum

### DigitalOcean Recommendation:
| Component | Plan | Monthly |
|-----------|------|---------|
| Droplet | Basic 2GB | $12 |
| Managed Postgres | Basic-1 | $15 |
| Managed Redis | Basic-1 | $15 |
| Spaces (images) | Starter | $5 |
| **Total** | | **$47/month** |

### Alternative - Hetzner:
| Component | Plan | Monthly |
|-----------|------|---------|
| CPX11 | 2GB RAM | $3.60 |
| Managed Postgres | External or self-hosted | $0-15 |
| **Total** | | **$3.60-18.60/month** |

---

## Option B: Saleor Minimal Setup

### Requirements:
- Python/Django runtime
- PostgreSQL database
- Redis (required)
- GraphQL API
- 2-4 GB RAM recommended

### DigitalOcean Recommendation:
| Component | Plan | Monthly |
|-----------|------|---------|
| Droplet | Basic 4GB | $24 |
| Managed Postgres | Basic-2 | $30 |
| Managed Redis | Basic-2 | $30 |
| Spaces (product images) | Starter | $5 |
| **Total** | | **$89/month** |

### Alternative - Hetzner:
| Component | Plan | Monthly |
|-----------|------|---------|
| CPX21 | 4GB RAM | $6.90 |
| Self-hosted Postgres | Included | $0 |
| Self-hosted Redis | Included | $0 |
| **Total** | | **$6.90/month** |

---

## Option C: Both MedusaJS + Saleor Together

### Requirements:
- Two separate application instances
- Shared or separate databases
- Load balancer recommended
- 4-8 GB RAM total

### DigitalOcean Recommendation:
| Component | Plan | Monthly |
|-----------|------|---------|
| Droplet 1 (MedusaJS) | Basic 2GB | $12 |
| Droplet 2 (Saleor) | Basic 4GB | $24 |
| Managed Postgres | Basic-4 | $60 |
| Managed Redis | Basic-2 | $30 |
| Spaces | Standard | $20 |
| Load Balancer | Basic | $12 |
| **Total** | | **$158/month** |

### Alternative - Single Server (Hetzner):
| Component | Plan | Monthly |
|-----------|------|---------|
| CPX31 | 8GB RAM | $13.40 |
| Self-hosted services | All included | $0 |
| Storage Box (backup) | BX11 | $3.50 |
| **Total** | | **$16.90/month** |

---

## Option D: Full Dayf Platform (MedusaJS + Saleor + Dayf)

### Requirements:
- Dayf Next.js application (existing)
- MedusaJS backend
- Saleor backend (optional GraphQL)
- Supabase (already configured)
- Redis (for queue/cache)
- Object storage (images)
- Email service (Resend)
- Push notifications (OneSignal)
- 8-16 GB RAM recommended

### DigitalOcean Recommendation (Production):
| Component | Plan | Monthly |
|-----------|------|---------|
| Droplet 1 (Dayf + MedusaJS) | General 8GB | $60 |
| Droplet 2 (Saleor) | General 4GB | $30 |
| Managed Postgres | Basic-4 | $60 |
| Managed Redis | Basic-4 | $60 |
| Spaces | Standard | $20 |
| Load Balancer | Standard | $25 |
| Backups | 20% of droplets | $18 |
| **Total** | | **$273/month** |

### Alternative - Hetzner Production:
| Component | Plan | Monthly |
|-----------|------|---------|
| CPX41 | 16GB RAM (multi-service) | $26.80 |
| Storage Box | BX21 (100GB) | $5.83 |
| Managed Postgres (Hetzner) | Essential | €5.83 (~$6.40) |
| **Total** | | **$39.03/month** |

### Alternative - Contabo Budget:
| Component | Plan | Monthly |
|-----------|------|---------|
| VPS M | 32GB RAM, 200GB | $19.80 |
| Storage | Included | $0 |
| **Total** | | **$19.80/month** |

---

# 5. COST COMPARISON SUMMARY

## Monthly Cost Comparison (Full Dayf Platform)

| Provider | Setup Type | Monthly Cost | Pros | Cons |
|----------|------------|--------------|------|------|
| DigitalOcean | Full managed | $273 | Easy scaling, managed DBs, good support | Expensive |
| DigitalOcean | Self-managed | $120 | Good balance, familiar platform | More maintenance |
| Hetzner | Self-managed | $39 | Excellent value, good performance | Less support, EU only |
| Contabo | Self-managed | $20 | Cheapest option | Variable performance, oversold |
| Railway | PaaS | ~$180-260 | Easy deploy, auto-scaling | Gets expensive fast |
| Render | PaaS | ~$150-200 | Good DX, free tier | Limited regions |

## Price per GB RAM Comparison

| Provider | $/GB RAM | Notes |
|----------|----------|-------|
| Contabo | $0.62 | Cheapest but oversold |
| Hetzner | $1.60 | Best value for money |
| DigitalOcean Basic | $6.00 | Reliable, good support |
| DigitalOcean General | $7.50 | Premium performance |
| Railway | $10.00 | PaaS premium |
| Render | $12.50 | PaaS premium |

---

# 6. RECOMMENDED ARCHITECTURE FOR SYRIAN TOURISM PLATFORM

## Recommended: Hetzner + Supabase (Hybrid)

### Why This Combination:
1. **Supabase already configured** - Keep using existing setup
2. **Hetzner for compute** - Excellent price/performance
3. **Budget-friendly** - Allows more features within budget
4. **Syrian market focus** - Can optimize for regional traffic

### Configuration:
| Component | Provider | Plan | Monthly |
|-----------|----------|------|---------|
| Compute | Hetzner | CPX31 (8GB) | $13.40 |
| Database | Supabase | Free tier (500MB) | $0 |
| Redis | Upstash | Free tier (10K cmds/day) | $0 |
| Storage | Supabase Storage | Free tier (1GB) | $0 |
| Email | Resend | Free tier (3000/mo) | $0 |
| Notifications | OneSignal | Free tier (10K subs) | $0 |
| **Total (Start)** | | | **$13.40/month** |

### When to Scale Up:
| Users | Recommended Upgrade | Est. Monthly |
|-------|---------------------|--------------|
| 0-1000 | Current setup | $13.40 |
| 1000-5000 | Hetzner CPX41 + Supabase Pro | $45 |
| 5000-20000 | Hetzner CPX51 + Managed DB | $100 |
| 20000+ | Multi-droplet + Load Balancer | $200+ |

---

# 7. DEPLOYMENT STRATEGY

## Phase 1: Development/Staging (FREE)
```
- Vercel (Free tier) - Frontend
- Supabase (Free tier) - Database
- Upstash (Free tier) - Redis
- Resend (Free tier) - Email
- OneSignal (Free tier) - Push
Total: $0/month
```

## Phase 2: Production MVP ($15-50/month)
```
- Hetzner CPX21 ($6.90) or DO Basic $12
- Supabase Free or Pro ($25)
- Upstash Free or Pro ($10)
- Resend Free
Total: $7-47/month
```

## Phase 3: Growth ($50-150/month)
```
- Hetzner CPX31/41 ($13-27) or DO General ($60)
- Supabase Pro ($25)
- Upstash Pay-as-you-go ($20)
- Managed Redis ($15-30)
- Load Balancer ($12-25)
Total: $85-167/month
```

## Phase 4: Scale ($200+/month)
```
- Multiple servers + Load Balancer
- Managed PostgreSQL ($60+)
- Managed Redis ($30+)
- CDN + Object Storage ($20+)
- Monitoring + Logging ($20+)
Total: $200-500/month
```

---

# 8. FINAL RECOMMENDATIONS

## For Syrian Tourism Platform (Dayf):

### Best Value: **Hetzner + Supabase**
- Cost: $13-40/month initially
- Excellent performance
- Keep existing Supabase setup
- Good for Arabic/Middle East traffic

### Most Reliable: **DigitalOcean**
- Cost: $47-273/month depending on scale
- Excellent documentation
- Managed services reduce maintenance
- Good support

### Fastest Deploy: **Railway or Render**
- Cost: $100-200/month
- Zero DevOps required
- Git-based deployments
- Good for rapid prototyping

### Budget Option: **Contabo**
- Cost: $6-20/month
- Maximum resources per dollar
- Variable performance
- Good for development/testing

## Recommended Path:

1. **Start with Hetzner + Supabase Free tier** ($0-15/month)
2. **Add Upstash Redis** as needed ($0-10/month)
3. **Scale to Supabase Pro** when hitting limits ($25/month)
4. **Consider multi-region** for Syrian diaspora users
5. **Use CDN** (Cloudflare Free) for static assets

---

*Research compiled for Dayf Platform planning purposes*
*Prices subject to change - verify on provider websites before deployment*
