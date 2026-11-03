# Screenshots to Video

A paid screenshot-to-video product for demo and launch videos, built on **TanStack Start**, **Drizzle ORM**, **better-auth**, and **shadcn/ui v4**. Product behavior, setup requirements, and integration verification status are documented in [docs/implementation-status.md](docs/implementation-status.md).

---

## Quick Start

```bash
pnpm install
cp .env.example .env.development   # configure DATABASE_URL, AUTH_SECRET, etc.
pnpm db:push                       # sync schema to database
pnpm rbac:init --admin-email=admin@example.com --admin-password=your-password
pnpm dev                           # starts dev server at http://localhost:3000
```

> **Note**: Local environment variables are loaded from `.env.development`. Minimal variables required to boot: `VITE_APP_URL`, `DATABASE_PROVIDER`, `DATABASE_URL`, and `AUTH_SECRET`.

---

## Core Features

### 1. AI Creation Suites

- **Text-to-Image & Image-to-Image** (`/workspace/ai-image`): Multi-model support, aspect ratio controls, reference image upload.
- **Text-to-Video & Image-to-Video** (`/workspace/ai-video`): Duration (5s/10s), resolution (480P/720P/1080P), prompt enhancement.
- **Text-to-Music** (`/workspace/ai-audio`): Instrumental & vocal tracks, custom styles.
- **PNG Background Remover** (`/workspace/png-maker`): High-precision subject extraction and instant cutout.
- **Creations Management** (`/workspace/gallery`, `/settings/creations`): Client-side local caching (14-day expiry) with automatic cloud database sync, asynchronous task polling, and instant preview.

### 2. Multi-Provider AI Engine

- **Supported Providers**: APIMart, KIE, Fal.ai, Replicate.
- **Mock Mode**: Built-in mock generation (`?mock=1` or local dev) allows full UI/UX testing without active API keys.
- **Resilient Pipeline**: Credit deduction before generation, automatic credit rollback upon task cancellation or failure, background R2/S3 storage synchronization.

### 3. SaaS Infrastructure

- **Credits System**: FIFO credit deduction based on model/duration/resolution parameters, signup gift credits, automated refund handling.
- **Payments & Subscriptions**: Stripe, PayPal, Alipay, and WeChat Pay with webhook signature verification.
- **Authentication**: Email/password, OAuth (Google, GitHub), verification emails via `better-auth`.
- **RBAC**: Multi-role system with wildcard permissions and admin management UI.
- **Storage**: S3/Cloudflare R2 image upload with automatic base64 fallback.
- **Internationalization (i18n)**: English and Chinese powered by Paraglide JS with compile-time type safety.
- **Admin Dashboard** (`/admin`): Complete back-office management for Users, Roles, Permissions, Content (Posts/Categories), Billing (Payments/Subscriptions/Credits), and System Settings.
- **Content & CMS**: MDX-driven static pages (Terms of Service, Privacy Policy) and blog post management.

---

## Tech Stack

- **Framework**: TanStack Start (React 19, Vite 8, Nitro server engine, TypeScript)
- **State & Data Fetching**: TanStack Query v5, TanStack Form, TanStack Table
- **Styling**: Tailwind CSS 4, shadcn/ui (Base Nova style), Lucide Icons
- **Database & ORM**: Drizzle ORM (SQLite / PostgreSQL / MySQL)
- **Auth**: better-auth with Drizzle adapter
- **i18n**: Paraglide JS 2.x

---

## Project Structure

```
src/
├── core/                  # Infrastructure layer
│   ├── ai/                # AI providers (APIMart, KIE, Fal, Replicate) & interfaces
│   ├── auth/              # better-auth configuration (server + client) & RBAC
│   ├── db/                # Multi-DB client initialization (SQLite, Postgres, MySQL)
│   ├── payment/           # Payment gateway adapters (Stripe, PayPal, Alipay, WeChat)
│   ├── storage/           # S3 / Cloudflare R2 storage integration
│   └── email/             # Resend email client
├── modules/               # Domain business logic
│   ├── ai/                # AI generation service, mock handlers, R2 sync
│   ├── creations/         # Client creation store, local storage caching & event bus
│   ├── credits/           # Credit consumption, balance check & refund service
│   ├── payment/           # Checkout sessions, orders & webhook handlers
│   ├── subscriptions/     # Subscription lifecycle management
│   ├── rbac/              # Role & permission validation
│   └── config/            # Dynamic system configuration service
├── routes/                # File-based routing (pages + API endpoints)
│   ├── (auth)/            # Sign-in, sign-up, email verification
│   ├── workspace/         # AI creation studios (image, video, audio, png-maker, gallery)
│   ├── settings/          # User dashboard (profile, billing, credits, creations)
│   ├── admin/             # Back-office admin panel
│   └── api/               # Server-side REST endpoints (/api/ai/*, /api/payment/*, etc.)
├── components/            # Reusable UI components & creation panels
├── config/                # Environment variables, DB schema, locale definitions
└── lib/                   # Utilities (api-client, query-client, rate-limit, resp)
```

---

## Commands

| Command            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `pnpm dev`         | Start Vite development server (port 3000)             |
| `pnpm build`       | Production build                                      |
| `pnpm start`       | Run production server                                 |
| `pnpm db:setup`    | Copy schema template for chosen database              |
| `pnpm db:push`     | Push schema changes directly to database (Dev)        |
| `pnpm db:generate` | Generate SQL migration files (Production)             |
| `pnpm db:migrate`  | Execute pending database migrations                   |
| `pnpm db:studio`   | Open Drizzle Studio visual database inspector         |
| `pnpm rbac:init`   | Initialize default roles, permissions, and admin user |
| `pnpm rbac:assign` | Assign role to user via CLI                           |

---

## Environment Variables

```env
# App
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME=Screenshots to Video
VITE_APP_DESCRIPTION=AI Video, Image & Music Generation Studio
VITE_APP_LOGO=/logo.svg
VITE_DEFAULT_LOCALE=en

# Database
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:data/local.db

# Auth
AUTH_SECRET=generate-with-openssl-rand-base64-32

# AI Providers (can also be configured via Admin Settings -> AI)
REPLICATE_API_TOKEN=

# Storage (Optional - falls back to DB base64 if unconfigured)
STORAGE_ENDPOINT=
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_PUBLIC_DOMAIN=

# Payments (Optional)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# Email (Optional)
RESEND_API_KEY=
```

---

## License

Proprietary software. All rights reserved.
