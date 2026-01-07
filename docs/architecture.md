# Architecture

## System Overview

Body Biz is a client management and payment processing system built on Next.js with Supabase (database/auth) and Stripe (payments).

```
                                    EXTERNAL SERVICES
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │   ┌──────────────┐         ┌──────────────┐                    │
    │   │   Stripe     │         │   Resend     │                    │
    │   │  (Payments)  │         │  (Email)     │                    │
    │   └──────┬───────┘         └──────┬───────┘                    │
    │          │                        │                            │
    └──────────┼────────────────────────┼────────────────────────────┘
               │                        │
               │ Webhooks               │ API
               ▼                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                         NEXT.JS APP                             │
    │                         (Vercel)                                │
    │  ┌──────────────────────────────────────────────────────────┐  │
    │  │                    API Routes                             │  │
    │  │  /api/webhooks/stripe  │  /api/clients  │  /api/payments │  │
    │  └──────────────────────────────────────────────────────────┘  │
    │                              │                                  │
    │  ┌──────────────────────────────────────────────────────────┐  │
    │  │                    App Router                             │  │
    │  │  /(auth)/login  │  /(dashboard)/clients, payments, etc.  │  │
    │  └──────────────────────────────────────────────────────────┘  │
    │                              │                                  │
    └──────────────────────────────┼──────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                         SUPABASE                                │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
    │  │   Auth      │  │  Postgres   │  │    RLS      │             │
    │  │  (Users)    │  │  (Data)     │  │ (Security)  │             │
    │  └─────────────┘  └─────────────┘  └─────────────┘             │
    └─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Flow 1: New Client Payment Link

```
Staff                    Next.js                   Supabase                  Stripe
  │                         │                         │                         │
  │ 1. Fill payment form    │                         │                         │
  │────────────────────────>│                         │                         │
  │                         │ 2. Create client        │                         │
  │                         │────────────────────────>│                         │
  │                         │                         │                         │
  │                         │ 3. Create Checkout      │                         │
  │                         │ Session                 │                         │
  │                         │────────────────────────────────────────────────────>
  │                         │                         │                         │
  │                         │<────────────────────────────────────────────────────
  │                         │ 4. Session URL          │                         │
  │                         │                         │                         │
  │                         │ 5. Store purchase       │                         │
  │                         │ (pending) + link        │                         │
  │                         │────────────────────────>│                         │
  │                         │                         │                         │
  │<────────────────────────│                         │                         │
  │ 6. Display link         │                         │                         │
  │                         │                         │                         │
```

```
Client                   Stripe                    Next.js                   Supabase
  │                         │                         │                         │
  │ 1. Click payment link   │                         │                         │
  │────────────────────────>│                         │                         │
  │                         │                         │                         │
  │ 2. Complete checkout    │                         │                         │
  │<───────────────────────>│                         │                         │
  │                         │                         │                         │
  │                         │ 3. Webhook:             │                         │
  │                         │ checkout.session.       │                         │
  │                         │ completed               │                         │
  │                         │────────────────────────>│                         │
  │                         │                         │ 4. Update purchase      │
  │                         │                         │ status = 'active'       │
  │                         │                         │────────────────────────>│
  │                         │                         │                         │
  │                         │                         │ 5. Mark link 'used'     │
  │                         │                         │────────────────────────>│
  │                         │                         │                         │
  │                         │                         │ 6. Send confirmation    │
  │                         │                         │ email via Resend        │
  │                         │                         │                         │
```

### Flow 2: Recharge Existing Client

```
Staff                    Next.js                   Stripe                    Supabase
  │                         │                         │                         │
  │ 1. View client profile  │                         │                         │
  │────────────────────────>│                         │                         │
  │                         │ 2. Fetch client +       │                         │
  │                         │ payment methods         │                         │
  │                         │────────────────────────────────────────────────────>
  │                         │<────────────────────────────────────────────────────
  │<────────────────────────│                         │                         │
  │ 3. Display profile      │                         │                         │
  │                         │                         │                         │
  │ 4. Click "New Charge"   │                         │                         │
  │ select program, amount  │                         │                         │
  │────────────────────────>│                         │                         │
  │                         │ 5. Create subscription  │                         │
  │                         │ (or PaymentIntent)      │                         │
  │                         │────────────────────────>│                         │
  │                         │<────────────────────────│                         │
  │                         │ 6. Success              │                         │
  │                         │                         │                         │
  │                         │ 7. Create purchase      │                         │
  │                         │ record                  │                         │
  │                         │────────────────────────────────────────────────────>
  │<────────────────────────│                         │                         │
  │ 8. "Charge successful"  │                         │                         │
```

---

## Database Schema

### Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   clients   │       │  programs   │
│  (staff)    │       │             │       │ (templates) │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │       │ email       │       │ name        │
│ name        │       │ name        │       │ default_    │
│ role        │──┐    │ stripe_     │       │ price       │
│ commission_ │  │    │ customer_id │    ┌──│ is_addon    │
│ rate        │  │    │ assigned_   │◄───┤  └─────────────┘
└─────────────┘  │    │ trainer_id  │────┘         │
                 │    └─────────────┘              │
                 │           │                     │
                 │           ▼                     │
                 │    ┌─────────────┐              │
                 │    │  purchases  │              │
                 │    ├─────────────┤              │
                 │    │ id (PK)     │              │
                 └───►│ trainer_id  │◄─────────────┘
                      │ client_id   │
                      │ program_id  │
                      │ amount      │
                      │ status      │
                      │ stripe_*_id │
                      │ commission  │
                      │ fields      │
                      └─────────────┘
                             │
                      ┌──────┴──────┐
                      │             │
                      ▼             ▼
               ┌─────────────┐ ┌─────────────┐
               │payment_links│ │ audit_log   │
               ├─────────────┤ ├─────────────┤
               │ id (PK)     │ │ id (PK)     │
               │ purchase_id │ │ user_id     │
               │ url         │ │ action      │
               │ status      │ │ details     │
               └─────────────┘ └─────────────┘
```

### Tables Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Staff/trainers | role, commission_rate |
| `clients` | Customer records | stripe_customer_id, assigned_trainer_id |
| `programs` | Service templates | default_price, is_addon, is_recurring |
| `purchases` | Transactions | amount, status, commission fields |
| `payment_links` | Checkout URLs | stripe_checkout_session_id, status |
| `audit_log` | Activity tracking | action, entity_type, details |

---

## Component Architecture

### Page Components (Server Components)

```
/(dashboard)
├── layout.tsx          # Auth guard, sidebar navigation
├── page.tsx            # Dashboard home (stats, activity)
├── /clients
│   ├── page.tsx        # Client list with search/filter
│   ├── [id]/page.tsx   # Client profile
│   └── new/page.tsx    # Add client form
├── /payments
│   ├── page.tsx        # Payment history
│   └── new-link/page.tsx # Create payment link
└── /reports
    └── page.tsx        # Revenue & commission reports
```

### UI Components (Client Components where needed)

```
/components/ui
├── Button.tsx          # Primary, secondary, danger variants
├── Input.tsx           # Text, email, number inputs
├── Select.tsx          # Dropdown select
├── Card.tsx            # Content container
├── Modal.tsx           # Dialog overlay
├── Table.tsx           # Data table with sorting
├── Badge.tsx           # Status indicators
└── Spinner.tsx         # Loading indicator
```

### Lib Modules

```
/lib
├── supabase.ts         # createClient (browser), createServerClient (server)
├── stripe.ts           # Stripe instance
├── utils.ts            # formatCurrency, calcCommission, formatDate
└── auth.ts             # getCurrentUser, requireAuth, requireRole
```

---

## Security Architecture

### Authentication Flow

```
1. User navigates to /(dashboard)/*
2. Middleware checks for Supabase session
3. No session → redirect to /(auth)/login
4. Valid session → check users table for role
5. Render appropriate UI based on role
```

### Authorization (RLS)

```sql
-- Trainers can only see their own clients
CREATE POLICY "Trainers see own clients" ON clients
  FOR SELECT TO authenticated
  USING (assigned_trainer_id = auth.uid());

-- Admin/Manager can see everything
CREATE POLICY "Admin/Manager full access" ON clients
  FOR ALL TO authenticated
  USING (is_admin_or_manager());
```

### Webhook Security

```typescript
// Always verify Stripe webhook signatures
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhooks/stripe` | POST | Handle Stripe events |
| `/api/clients` | GET, POST | List/create clients |
| `/api/clients/[id]` | GET, PATCH, DELETE | Single client operations |
| `/api/payments/create-link` | POST | Create Stripe Checkout session |
| `/api/payments/charge` | POST | Charge saved payment method |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          VERCEL                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Edge Network (CDN)                          │    │
│  │  Static assets, incremental static regeneration          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Serverless Functions                        │    │
│  │  API routes, server components, middleware               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌──────────┐     ┌──────────┐     ┌──────────┐
       │ Supabase │     │  Stripe  │     │  Resend  │
       │ (Postgres│     │ (Payments│     │ (Email)  │
       │  + Auth) │     │  + Subs) │     │          │
       └──────────┘     └──────────┘     └──────────┘
```

---

## Performance Considerations

- **Server Components** by default (reduced client JS bundle)
- **Streaming** for large data tables
- **Database indexes** on frequently queried fields (trainer_id, client_id, status)
- **Edge caching** for static assets via Vercel

---

*Last updated: 2025-01-06*
