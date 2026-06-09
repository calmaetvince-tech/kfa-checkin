# KFA — Kallistis Fight Academy QR Check-in PWA

Mobile-first web app for fight gyms. The owner adds members and scans their QR
codes from a phone. Members get a personal link with their QR code, their stats,
their **training streak**, and a **30-day heatmap**. Built single-tenant for
Kallistis Fight Academy (case study #1) and now prepared to become a multi-gym
micro-SaaS.

- **Stack:** Next.js 14 (App Router) + Tailwind + Supabase (Postgres + Auth)
- **Camera scan:** `html5-qrcode` (in-browser, no native install)
- **PWA:** per-member manifest + maskable icons, add-to-home-screen install flow
- **Deploy target:** Vercel · live at `gold-ring-legacy.vercel.app`

**Brand assets:** logo at `public/brand/kfa-logo.png`; home-screen + OG icons in
`public/icons/`; static social card at `public/brand/og-image.png`.

## What's in the box

| Route | Who | What it does |
|---|---|---|
| `/` | Public | Landing page (auto-redirects returning members to their QR) |
| `/login` | Owner | Email/password sign-in |
| `/dashboard` | Owner | Stats, **today's check-in feed**, **renewals-due list**, member list |
| `/dashboard/add` | Owner | Create a member (profile + emergency contact + plan) |
| `/dashboard/member/[id]` | Owner | Detail, QR, renew, **rotate QR**, delete |
| `/dashboard/scan` | Owner | Camera QR scan → logs check-in (with sound + haptics) |
| `/m/[token]` | Member | QR + stats + **streak** + **30-day heatmap** (no login) |
| `/m/[token]/opengraph-image` | — | Dynamic social card (member name + current streak) |
| `/m/[token]/manifest.webmanifest` | — | Per-member PWA manifest (icon opens straight to their QR) |

## Feature highlights

- **Streaks** — `get_member_streak` RPC computes current + longest consecutive
  training-day streaks (bucketed in `Europe/Athens`). Shown big on the member
  page — the #1 retention nudge.
- **30-day heatmap** — pure CSS-grid calendar on the member page, trained days
  lit in brand gold. No charting library.
- **Today's check-ins feed** — live roll of who came in today on the dashboard.
- **Renewals due** — members expiring within 7 days, soonest first. The owner's
  money list.
- **Per-member OG image** — when a member shares their link, the preview shows
  their name + streak (`next/og` `ImageResponse`).
- **Rate limiting** — `/m/[token]` is limited to 10 req/min/IP when Upstash env
  vars are set; no-op otherwise.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

From **Project Settings → API**, copy:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> The app no longer needs the service-role key at runtime — the public member
> view uses `SECURITY DEFINER` RPCs scoped to the URL token. Keep the service
> key out of the client.

### 3. Configure environment

```bash
cp .env.example .env.local   # then fill in the values
```

Optional: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to enable
rate limiting on the public member page.

### 4. Apply the schema

Run the migrations **in order** in the Supabase SQL editor (or
`supabase db push` with the CLI):

```
supabase/migrations/
  0001_init.sql                  base tables, RLS, is_admin(), stats view
  0003_member_extra_columns.sql  plan, discipline, DOB, emergency contact
  0004_member_rpcs.sql           get_member_by_token / get_member_visits
  0005_multi_tenant_prep.sql     gyms table, gym_id, gym-scoped RLS, RPC joins
  0006_streak_and_heatmap.sql    get_member_streak / get_member_active_days
```

(`0002_seed_admin.sql.example` is a copy-paste template, not auto-run.)

### 5. Create the owner account

In **Authentication → Users**, add a user with email/password. Then grant admin:

```sql
insert into public.admins (user_id, gym_id)
select u.id, g.id
from auth.users u, public.gyms g
where u.email = 'owner@yourgym.com' and g.slug = 'kallistis';
```

### 6. Run locally

```bash
npm run dev
```

Open <http://localhost:3000>, sign in at `/login`, add a member.

> **Camera note:** browsers grant camera access only over HTTPS or `localhost`.
> To test scanning from a phone, use a tunnel (cloudflared/ngrok) or deploy.

## Deploy to Vercel

1. Push to a Git repo, import into Vercel.
2. Add env vars (same as `.env.local`). Set `NEXT_PUBLIC_APP_URL` to the
   production URL so QR codes + OG images encode the right host.
3. Deploy. Install as a PWA: **Share → Add to Home Screen**.

## Data model

```
gyms        (id, name, slug UNIQUE, subscription_status, subscription_expires_at, created_at)
admins      (user_id PK → auth.users, gym_id → gyms)
members     (id, name, email, phone, qr_token UNIQUE,
             subscription_renewed_at, subscription_expires_at, notes, created_at,
             date_of_birth, emergency_contact_name, emergency_contact_phone,
             plan, discipline, gym_id → gyms)
check_ins   (id, member_id FK, checked_in_at)
```

- `qr_token` is a 32-char random hex (`encode(gen_random_bytes(16),'hex')`) — the
  secret embedded in the QR.
- "Active" subscription is derived: `subscription_expires_at > now()`.

### Row-level security

- `members` + `check_ins`: managed only by an `admin`, scoped to **their gym**
  (`gym_id = current_gym_id()`). `check_ins` is scoped via its member's gym.
- `gyms`: an admin can read their own gym row.
- The public member page reads via three `SECURITY DEFINER` RPCs
  (`get_member_by_token`, `get_member_visits`, `get_member_streak`,
  `get_member_active_days`) granted to `anon` — each scoped to the token, so the
  service-role key is never used client-side.

### Multi-tenant status

The schema is **prepared** for multiple gyms (gyms table, `gym_id` everywhere,
gym-scoped RLS) but the app still runs single-tenant — every existing row is
backfilled to the Kallistis gym. Before activating multi-tenant:

- `member_month_stats` is a plain view (runs as owner, bypasses RLS). Recreate it
  with `security_invoker = true` or add an explicit `gym_id` filter so the
  dashboard can't read across gyms.
- Add gym onboarding (create gym + first admin) and a gym switcher.

## How the QR flow works

1. Owner adds a member → DB generates `qr_token`.
2. Owner shares `https://yourapp/m/<token>` (WhatsApp button on the detail page).
3. Member opens it → sees their QR + stats + streak → installs to home screen.
4. At the gym, member shows the QR. Owner's `/dashboard/scan` decodes the URL,
   looks up `qr_token`, inserts a `check_ins` row, and shows the member's status
   with an audio + haptic confirmation.

## Customization knobs

- Subscription presets: `app/dashboard/add/AddMemberForm.tsx`.
- Token format accepted by the scanner: `app/dashboard/scan/actions.ts`.
- Brand color + timezone: `tailwind.config.ts` and the `Europe/Athens` literal in
  the streak/heatmap migrations.
