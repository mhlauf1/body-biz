# Body Biz Client Management System

## Project Overview

Internal dashboard for The Body Biz (Columbus, OH personal training studio) that replaces their janky Foxy.io + Authorize.net + Zapier + Google Sheets setup with a unified Stripe-powered system.

**Client:** The Body Biz (thebody.biz)  
**Built by:** Lauf (lauf.co)

## Problem We're Solving

- Kate (owner) and her trainers need to charge clients for custom programs
- Current system requires new payment links even for existing clients with cards on file
- Commission tracking is manual spreadsheet hell
- Zapier automations break constantly
- No client history, no email confirmations, duplicate charges happen

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Payments:** Stripe (Checkout, Subscriptions, saved cards)
- **Email:** Resend
- **Styling:** Tailwind CSS v4
- **Hosting:** Vercel

## User Roles

| Role      | Who            | Access                     | Commission                            |
| --------- | -------------- | -------------------------- | ------------------------------------- |
| `admin`   | Kate           | Everything                 | 100% own clients, 30% cut from others |
| `manager` | Lexie          | Everything (same as admin) | 70% (Kate gets 30%)                   |
| `trainer` | Mattie, others | Own clients only           | 70% (Kate gets 30%)                   |

**Key:** Manager has admin ACCESS but trainer COMMISSION.

## Core Flows

1. **New client checkout:** Create payment link → Client pays via Stripe Checkout → Webhook updates DB → Email sent
2. **Recharge existing client:** Find client → Select program → Charge saved card → Done
3. **Commission tracking:** Automatic calculation stored on each purchase

## Database Tables

- `users` — Staff/trainers with role and commission_rate
- `clients` — Clients with stripe_customer_id for saved cards
- `programs` — Templates (3 Month Coaching, Testing Fee, etc.)
- `purchases` — Actual transactions with commission breakdown
- `payment_links` — One-time use, auto-expire checkout links
- `audit_log` — Track all sensitive operations

See `/docs/SPEC.md` for full schema with SQL.

## Key Conventions

### File Structure

```
/app
  /api              → API routes (webhooks, CRUD)
  /(auth)           → Login pages (outside dashboard layout)
  /(dashboard)      → Main app (inside auth-protected layout)
/components
  /ui               → Shared components (buttons, inputs, etc.)
/lib
  /supabase.ts      → Supabase client setup
  /stripe.ts        → Stripe client setup
  /utils.ts         → Helpers
/types
  /database.ts      → Generated Supabase types
```

### Code Style

- Use Server Components by default, Client Components only when needed
- Validate all inputs with Zod
- Use Supabase RLS for authorization, not just app-level checks
- Always verify Stripe webhook signatures
- Log sensitive operations to audit_log

### Naming

- API routes: `/api/clients`, `/api/payments`, `/api/webhooks/stripe`
- Components: PascalCase (`ClientList.tsx`)
- Utils: camelCase (`formatCurrency.ts`)
- Database: snake_case (`stripe_customer_id`)

### Error Handling

- API routes return `{ error: string }` on failure with appropriate status
- Use try/catch around Stripe and Supabase calls
- Show user-friendly errors in UI, log details server-side

## Security Rules

- NEVER log full card numbers or Stripe secrets
- ALWAYS verify webhook signatures before processing
- ALWAYS use RLS — don't trust client-side role checks alone
- Trainers can only access their own clients (enforced at DB level)

## Commission Logic

```typescript
// When creating a purchase:
if (trainer.role === "admin") {
  // Kate keeps 100% of her own clients
  trainer_commission_rate = 1.0;
  trainer_amount = amount;
  owner_amount = 0;
} else {
  // Everyone else: 70/30 split
  trainer_commission_rate = 0.7;
  trainer_amount = amount * 0.7;
  owner_amount = amount * 0.3;
}
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

## Reference Docs

- Full technical spec: `/docs/SPEC.md`
- Stripe docs: https://stripe.com/docs
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs

## Current Status

🚧 **In Development**

Building MVP with Lexie (manager) as first tester. Kate doesn't know about the rebuild yet — proving it works first.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
```
