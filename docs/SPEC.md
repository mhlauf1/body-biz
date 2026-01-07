# Body Biz Client Management System

## Technical Specification v1.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [User Roles & Permissions](#user-roles--permissions)
5. [UI Screens & Flows](#ui-screens--flows)
6. [Payment Flows](#payment-flows)
7. [Email Automations](#email-automations)
8. [Security](#security)
9. [Migration Plan](#migration-plan)
10. [Tech Stack Details](#tech-stack-details)

---

## System Overview

### What We're Building

An internal dashboard for The Body Biz that replaces the current Foxy.io + Authorize.net + Zapier + Google Sheets stack with a unified system built on Stripe.

### Core Problems We're Solving

| Problem                                          | Solution                                          |
| ------------------------------------------------ | ------------------------------------------------- |
| Recharging old clients requires new payment link | One-click recharge using saved payment method     |
| Foxy is confusing for staff                      | Simple, purpose-built UI anyone can use           |
| Zapier breaks due to incomplete data             | Structured forms with required fields, validation |
| No client history view                           | Full client profile with purchase history         |
| No email confirmations                           | Automatic emails on purchase, renewal, etc.       |
| Double purchases from reused links               | Links auto-expire after single use                |
| Manual commission tracking                       | Automatic calculation by trainer                  |
| Subscription reactivation is hard                | One-click pause/resume/cancel                     |

### What Stays the Same

- Webflow marketing site (thebody.biz) - untouched
- Trainers still set their own pricing for custom programs
- Kate still manually pays trainers (no auto-payout for MVP)

### What Changes

- All payments go through Stripe (replaces Foxy + Authorize.net)
- All client/payment data lives in Supabase (replaces Google Sheets)
- Staff uses new dashboard for all operations (replaces Foxy admin)

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐         ┌──────────────┐                         │
│   │   Webflow    │         │    Client    │                         │
│   │  Marketing   │         │   Browser    │                         │
│   │    Site      │         │ (Payment)    │                         │
│   └──────────────┘         └──────┬───────┘                         │
│                                   │                                  │
│                                   │ Stripe Checkout Link             │
│                                   ▼                                  │
│                          ┌──────────────┐                           │
│                          │    Stripe    │                           │
│                          │   Checkout   │                           │
│                          └──────┬───────┘                           │
│                                 │                                    │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
                                  │ Webhook (payment_intent.succeeded)
                                  │
┌─────────────────────────────────┼────────────────────────────────────┐
│                         YOUR SYSTEM                                  │
├─────────────────────────────────┼────────────────────────────────────┤
│                                 ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      Next.js App                             │   │
│   │                      (Vercel)                                │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│   │  │   Admin     │  │  Trainer    │  │   API Routes        │  │   │
│   │  │  Dashboard  │  │  Dashboard  │  │  /api/webhook       │  │   │
│   │  │             │  │             │  │  /api/payments      │  │   │
│   │  │  - Clients  │  │  - My       │  │  /api/clients       │  │   │
│   │  │  - Trainers │  │    Clients  │  │  /api/trainers      │  │   │
│   │  │  - Reports  │  │  - Revenue  │  │                     │  │   │
│   │  │  - Programs │  │             │  │                     │  │   │
│   │  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │   │
│   │                                               │              │   │
│   └───────────────────────────────────────────────┼──────────────┘   │
│                                                   │                  │
│              ┌────────────────────────────────────┼──────────┐       │
│              │                                    │          │       │
│              ▼                                    ▼          ▼       │
│   ┌──────────────────┐              ┌─────────────────────────────┐ │
│   │    Supabase      │              │         Stripe API          │ │
│   │    (Postgres)    │              │                             │ │
│   │                  │              │  - Customers                │ │
│   │  - users         │              │  - Payment Methods          │ │
│   │  - clients       │              │  - Subscriptions            │ │
│   │  - programs      │              │  - Payment Intents          │ │
│   │  - purchases     │              │  - Checkout Sessions        │ │
│   │  - payment_links │              │                             │ │
│   └──────────────────┘              └─────────────────────────────┘ │
│                                                                      │
│              │                                                       │
│              ▼                                                       │
│   ┌──────────────────┐                                              │
│   │      Resend      │                                              │
│   │   (Email API)    │                                              │
│   │                  │                                              │
│   │  - Receipts      │                                              │
│   │  - Confirmations │                                              │
│   │  - Reminders     │                                              │
│   └──────────────────┘                                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Request Flow Examples

**New Client Checkout:**

```
1. Staff creates payment link in dashboard
2. System creates Stripe Checkout Session
3. System stores pending purchase + link in Supabase
4. Staff sends link to client
5. Client completes checkout on Stripe
6. Stripe sends webhook to /api/webhook
7. Webhook handler:
   - Updates purchase status to 'active'
   - Marks payment link as 'used'
   - Triggers confirmation email via Resend
```

**Recharge Existing Client:**

```
1. Staff finds client in dashboard
2. Clicks "New Charge" button
3. Selects program, enters amount, duration
4. System charges saved payment method via Stripe API
5. On success:
   - Creates new purchase record
   - Triggers receipt email
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   clients   │       │  programs   │
│  (staff)    │       │             │       │ (templates) │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │       │ email       │       │ name        │
│ name        │       │ name        │       │ description │
│ role        │──┐    │ phone       │       │ default_    │
│ commission_ │  │    │ stripe_     │    ┌──│ price       │
│ rate        │  │    │ customer_id │    │  │ default_    │
│ created_at  │  │    │ assigned_   │◄───┤  │ duration    │
│ updated_at  │  │    │ trainer_id  │────┘  │ is_active   │
└─────────────┘  │    │ notes       │       │ created_at  │
                 │    │ created_at  │       └─────────────┘
                 │    │ updated_at  │              │
                 │    └─────────────┘              │
                 │           │                     │
                 │           │                     │
                 │           ▼                     │
                 │    ┌─────────────┐              │
                 │    │  purchases  │              │
                 │    ├─────────────┤              │
                 │    │ id (PK)     │              │
                 └───►│ trainer_id  │◄─────────────┘
                      │ client_id   │──────────────►(clients.id)
                      │ program_id  │──────────────►(programs.id)
                      │ amount      │
                      │ duration_   │
                      │ months      │
                      │ start_date  │
                      │ end_date    │
                      │ status      │
                      │ stripe_     │
                      │ subscription│
                      │ _id         │
                      │ stripe_     │
                      │ payment_    │
                      │ intent_id   │
                      │ payment_    │
                      │ link_id     │──────────────►(payment_links.id)
                      │ notes       │
                      │ created_at  │
                      │ updated_at  │
                      └─────────────┘
                             │
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
               │ stripe_     │ │ entity_type │
               │ checkout_   │ │ entity_id   │
               │ session_id  │ │ details     │
               │ status      │ │ created_at  │
               │ expires_at  │ └─────────────┘
               │ used_at     │
               │ created_at  │
               └─────────────┘
```

### Table Definitions

#### users (Staff & Trainers)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'trainer')),
  commission_rate DECIMAL(5,4) DEFAULT 0.70,  -- 0.70 = 70% (ignored for admin, who gets 100% on own + 30% of others)
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kate = admin (sees everything, 100% on her clients, 30% cut from all other trainers)
-- Lexie = manager (full admin access, but gets 70% commission like a trainer)
-- Mattie, future trainers = trainer (own clients only, 70% commission)
```

#### clients

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  stripe_customer_id VARCHAR(255) UNIQUE,  -- Stripe customer ID for saved payment methods
  assigned_trainer_id UUID REFERENCES users(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_trainer ON clients(assigned_trainer_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_stripe ON clients(stripe_customer_id);
```

#### programs (Templates)

```sql
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2),        -- Default price (can be overridden per purchase)
  default_duration_months INTEGER,    -- Default duration (can be overridden), NULL for one-time
  is_recurring BOOLEAN DEFAULT true,  -- Monthly subscription vs one-time
  is_addon BOOLEAN DEFAULT false,     -- True for things like testing fee that get added on
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example programs:
-- "3 Month Personal Coaching" - $700/mo, 3 months, recurring, not addon
-- "3 Month Personal Coaching (Lexie/Mattie rate)" - $625/mo, 3 months, recurring, not addon
-- "Nutrition Only" - $300/mo, 1 month, recurring, not addon
-- "VO2/RMR/Fit3D Testing" - $210, one-time (duration NULL), NOT recurring, IS addon
--
-- The testing fee is commonly added for new clients but not required.
-- It's a separate line item, one-time charge, can be added to any new client.
```

#### purchases

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  trainer_id UUID NOT NULL REFERENCES users(id),
  program_id UUID REFERENCES programs(id),  -- Can be null for fully custom

  -- Pricing (may differ from program defaults)
  amount DECIMAL(10,2) NOT NULL,            -- Monthly amount OR one-time amount
  duration_months INTEGER,                   -- NULL for ongoing subscriptions
  is_recurring BOOLEAN DEFAULT true,

  -- Dates
  start_date DATE,
  end_date DATE,                             -- Calculated from start + duration

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'completed', 'failed')),

  -- Stripe references
  stripe_subscription_id VARCHAR(255),       -- For recurring
  stripe_payment_intent_id VARCHAR(255),     -- For one-time
  stripe_checkout_session_id VARCHAR(255),

  -- Tracking
  payment_link_id UUID REFERENCES payment_links(id),
  custom_program_name VARCHAR(255),          -- If program_id is null, what to call it
  notes TEXT,

  -- Commission tracking (calculated at time of purchase)
  -- If trainer is Kate (admin): trainer_amount = 100%, owner_amount = 0
  -- If trainer is anyone else: trainer_amount = 70%, owner_amount = 30%
  trainer_commission_rate DECIMAL(5,4),      -- Snapshot: 1.00 for Kate, 0.70 for others
  trainer_amount DECIMAL(10,2),              -- What the trainer gets paid
  owner_amount DECIMAL(10,2),                -- What Kate gets (her cut from this purchase)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission calculation logic (in application code):
-- if trainer.role == 'admin':
--     trainer_commission_rate = 1.00
--     trainer_amount = amount
--     owner_amount = 0
-- else:
--     trainer_commission_rate = 0.70
--     trainer_amount = amount * 0.70
--     owner_amount = amount * 0.30

CREATE INDEX idx_purchases_client ON purchases(client_id);
CREATE INDEX idx_purchases_trainer ON purchases(trainer_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_stripe_sub ON purchases(stripe_subscription_id);
```

#### payment_links

```sql
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id),

  url TEXT NOT NULL,                         -- The Stripe Checkout URL
  stripe_checkout_session_id VARCHAR(255),

  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'expired', 'cancelled')),

  expires_at TIMESTAMPTZ,                    -- Auto-expire after X days
  used_at TIMESTAMPTZ,                       -- When client completed checkout

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_links_status ON payment_links(status);
CREATE INDEX idx_payment_links_purchase ON payment_links(purchase_id);
```

#### audit_log (for debugging and compliance)

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),         -- Who did it (null for system/webhook)
  action VARCHAR(100) NOT NULL,              -- 'create_client', 'charge_card', 'refund', etc.
  entity_type VARCHAR(50),                   -- 'client', 'purchase', 'payment_link'
  entity_id UUID,
  details JSONB,                             -- Additional context
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

### Supabase Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin/Manager can see all clients
-- Trainers can only see their assigned clients
CREATE POLICY "Full access for admin/manager" ON clients
  FOR ALL TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Trainers see own clients" ON clients
  FOR SELECT TO authenticated
  USING (assigned_trainer_id = auth.uid());

CREATE POLICY "Trainers create clients" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- Anyone can create, but assigned_trainer must be set

CREATE POLICY "Trainers update own clients" ON clients
  FOR UPDATE TO authenticated
  USING (assigned_trainer_id = auth.uid());

-- Similar policies for purchases
CREATE POLICY "Full access for admin/manager" ON purchases
  FOR ALL TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Trainers see own purchases" ON purchases
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers create purchases for own clients" ON purchases
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Payment links
CREATE POLICY "Full access for admin/manager" ON payment_links
  FOR ALL TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Trainers see own payment links" ON payment_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = payment_links.purchase_id
      AND purchases.trainer_id = auth.uid()
    )
  );
```

---

## User Roles & Permissions

### Role Definitions

| Role        | Who                  | Description                                                                                                                                         |
| ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**   | Kate                 | Owner. Full access to everything. Special commission: 100% on own clients, 30% cut from all other trainers.                                         |
| **Manager** | Lexie                | Office manager + trainer. Full admin access (runs payroll, sees all revenue, manages everything). Also trains clients with standard 70% commission. |
| **Trainer** | Mattie, future hires | Standard trainer. Only sees their own clients and revenue. 70% commission on their clients.                                                         |

### Commission Structure

| Scenario               | Trainer Gets | Kate Gets |
| ---------------------- | ------------ | --------- |
| Kate trains a client   | —            | 100%      |
| Lexie trains a client  | 70%          | 30%       |
| Mattie trains a client | 70%          | 30%       |
| Any other trainer      | 70%          | 30%       |

### Permission Matrix

| Action                  | Admin (Kate) | Manager (Lexie) | Trainer (Mattie) |
| ----------------------- | ------------ | --------------- | ---------------- |
| View all clients        | ✅           | ✅              | ❌ (own only)    |
| Create client           | ✅           | ✅              | ✅               |
| Edit any client         | ✅           | ✅              | ❌ (own only)    |
| View all purchases      | ✅           | ✅              | ❌ (own only)    |
| Create payment link     | ✅           | ✅              | ✅ (own clients) |
| Charge saved card       | ✅           | ✅              | ✅ (own clients) |
| Issue refund            | ✅           | ✅              | ❌               |
| View all revenue        | ✅           | ✅              | ❌ (own only)    |
| View commission reports | ✅           | ✅              | ✅ (own only)    |
| Run payroll reports     | ✅           | ✅              | ❌               |
| Manage trainers         | ✅           | ✅              | ❌               |
| Manage programs         | ✅           | ✅              | ❌               |

### Key Differences: Manager vs Admin

Lexie (Manager) has the same **access** as Kate (Admin), but different **commission rules**:

- Kate keeps 100% when she's the trainer, plus 30% of everyone else
- Lexie gets 70% when she's the trainer (Kate gets the other 30%)

In the code, both `admin` and `manager` roles pass the same permission checks. The only difference is in commission calculations.

### Auth Flow

```
1. User goes to dashboard URL (bodybiz-admin.vercel.app)
2. Supabase Auth handles login (magic link or password)
3. On successful auth, app checks users table for role
4. UI renders based on role:
   - Admin/Manager: see everything
   - Trainer: filtered to own clients
5. API routes verify permissions via RLS + middleware
```

### No Client Accounts

Clients do NOT have accounts or logins. They interact with the system only through:

- Payment links (Stripe hosted checkout)
- Email receipts

All client management happens through staff. This keeps things simple and secure.

---

## UI Screens & Flows

### Information Architecture

```
📁 Dashboard (role-based home)
│
├── 👥 Clients
│   ├── Client List (search, filter by trainer)     [All roles, but trainers filtered to own]
│   ├── Client Profile
│   │   ├── Basic Info
│   │   ├── Purchase History
│   │   ├── Payment Methods (from Stripe)
│   │   └── Actions: New Charge, Send Link, Edit
│   └── Add New Client                              [All roles]
│
├── 💰 Payments
│   ├── Recent Transactions                         [Admin/Manager: all, Trainer: own]
│   ├── Pending Links (active, not yet used)        [Admin/Manager: all, Trainer: own]
│   └── Create Payment Link                         [All roles]
│
├── 📊 Reports                                      [Admin/Manager only]
│   ├── Revenue Overview
│   ├── By Trainer (commission breakdown)
│   ├── By Program
│   └── Export (CSV for payroll)
│
├── 📋 Programs                                     [Admin/Manager only]
│   ├── Program List
│   └── Add/Edit Program
│
├── 👤 Team                                         [Admin/Manager only]
│   ├── Trainer List
│   └── Add/Edit Trainer
│
└── ⚙️ Settings
    └── My Profile                                  [All roles]
```

**Navigation by Role:**

| Role             | Sees in Nav                                          |
| ---------------- | ---------------------------------------------------- |
| Admin (Kate)     | Clients, Payments, Reports, Programs, Team, Settings |
| Manager (Lexie)  | Clients, Payments, Reports, Programs, Team, Settings |
| Trainer (Mattie) | Clients, Payments, Settings                          |

### Screen Wireframes

#### 1. Dashboard (Admin View)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏋️ Body Biz Admin                          Kate ▼  [Logout]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ $12,450      │ │ 23           │ │ 5            │             │
│  │ This Month   │ │ Active       │ │ Pending      │             │
│  │ Revenue      │ │ Clients      │ │ Links        │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  Recent Activity                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ Sarah M. completed payment - $700 (Lexie) - 2 min ago    ││
│  │ 🔗 Link sent to John D. - $625 (Mattie) - 1 hour ago        ││
│  │ ✅ Mike R. subscription renewed - $700 (Kate) - 3 hours ago ││
│  │ ❌ Payment failed for Lisa T. - Card declined - yesterday   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Quick Actions                                                   │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│  │ + New Client   │ │ + Payment Link │ │ 📊 View Reports │       │
│  └────────────────┘ └────────────────┘ └────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Client List

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 Clients                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [🔍 Search clients...                    ] [Trainer ▼] [+ Add] │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Name          │ Email              │ Trainer │ Status │     ││
│  ├───────────────┼────────────────────┼─────────┼────────┼─────┤│
│  │ Sarah Miller  │ sarah@email.com    │ Lexie   │ Active │ ••• ││
│  │ John Davis    │ john@email.com     │ Mattie  │ Pending│ ••• ││
│  │ Mike Roberts  │ mike@email.com     │ Kate    │ Active │ ••• ││
│  │ Lisa Thomas   │ lisa@email.com     │ Lexie   │ Failed │ ••• ││
│  │ Amy Chen      │ amy@email.com      │ Kate    │ Paused │ ••• ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Showing 1-5 of 23 clients                    [< Prev] [Next >] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Client Profile

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Clients                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Sarah Miller                                                ││
│  │  sarah@email.com • (614) 555-1234                           ││
│  │  Trainer: Lexie Long                                        ││
│  │                                                              ││
│  │  [💳 New Charge]  [🔗 Send Link]  [✏️ Edit]                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  💳 Payment Methods                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  •••• 4242  Visa  Expires 12/26  ✓ Default                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  📜 Purchase History                                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Date       │ Program              │ Amount │ Status         ││
│  ├────────────┼──────────────────────┼────────┼────────────────┤│
│  │ Jan 2026   │ 3 Month Coaching     │ $700   │ ✅ Active      ││
│  │ Oct 2025   │ 3 Month Coaching     │ $700   │ ✅ Completed   ││
│  │ Oct 2025   │ VO2/RMR Testing      │ $210   │ ✅ Completed   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  📝 Notes                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Prefers morning sessions. Has knee issue - modify squats.   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. New Charge Modal (One-Click Recharge)

```
┌───────────────────────────────────────────────┐
│  💳 New Charge for Sarah Miller          [X] │
├───────────────────────────────────────────────┤
│                                               │
│  Program                                      │
│  ┌─────────────────────────────────────────┐ │
│  │ 3 Month Personal Coaching            ▼ │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Amount (per month)                           │
│  ┌─────────────────────────────────────────┐ │
│  │ $ 700.00                                │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Duration                                     │
│  ┌─────────────────────────────────────────┐ │
│  │ 3 months                             ▼ │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Payment Method                               │
│  ┌─────────────────────────────────────────┐ │
│  │ •••• 4242 Visa (default)             ▼ │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ☑️ Send receipt email to client             │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │           Charge $700.00                │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Total: $2,100 over 3 months                 │
│  Trainer (70%): $1,470 • Owner (30%): $630  │
│                                               │
└───────────────────────────────────────────────┘
```

#### 5. Create Payment Link (New Client or Existing Without Card)

```
┌───────────────────────────────────────────────┐
│  🔗 Create Payment Link                  [X] │
├───────────────────────────────────────────────┤
│                                               │
│  Client                                       │
│  ○ Existing Client  ● New Client             │
│                                               │
│  Name *                                       │
│  ┌─────────────────────────────────────────┐ │
│  │ John Davis                              │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Email *                                      │
│  ┌─────────────────────────────────────────┐ │
│  │ john@email.com                          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Phone                                        │
│  ┌─────────────────────────────────────────┐ │
│  │ (614) 555-9876                          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Trainer *                                    │
│  ┌─────────────────────────────────────────┐ │
│  │ Mattie Betts                         ▼ │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Program *                                    │
│  ┌─────────────────────────────────────────┐ │
│  │ 3 Month Personal Coaching            ▼ │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Amount (per month) *                         │
│  ┌─────────────────────────────────────────┐ │
│  │ $ 625.00                                │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Duration *                                   │
│  ┌─────────────────────────────────────────┐ │
│  │ 3 months                             ▼ │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Link expires after                           │
│  ┌─────────────────────────────────────────┐ │
│  │ 7 days                               ▼ │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │           Generate Link                 │ │
│  └─────────────────────────────────────────┘ │
│                                               │
└───────────────────────────────────────────────┘
```

#### 6. Link Generated Success

```
┌───────────────────────────────────────────────┐
│  ✅ Payment Link Created                 [X] │
├───────────────────────────────────────────────┤
│                                               │
│  Send this link to John Davis:                │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ https://checkout.stripe.com/c/pay/cs_   │ │
│  │ live_abc123xyz...                       │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  [📋 Copy Link]  [📧 Email to Client]        │
│                                               │
│  ─────────────────────────────────────────── │
│                                               │
│  Details:                                     │
│  • Program: 3 Month Personal Coaching        │
│  • Amount: $625/month for 3 months           │
│  • Trainer: Mattie Betts                     │
│  • Expires: Jan 13, 2026                     │
│                                               │
│  ⚠️ This link can only be used once.         │
│                                               │
└───────────────────────────────────────────────┘
```

#### 7. Manager Dashboard (Lexie's View - Same as Admin)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏋️ Body Biz Admin                        Lexie ▼  [Logout]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ $12,450      │ │ 23           │ │ 5            │             │
│  │ Total Revenue│ │ Active       │ │ Pending      │             │
│  │ This Month   │ │ Clients      │ │ Links        │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  My Stats (Lexie)                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ My Clients: 8 │ My Revenue: $4,900 │ My Commission: $3,430  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Recent Activity (All Trainers)                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ Sarah M. completed payment - $700 (Lexie) - 2 min ago    ││
│  │ 🔗 Link sent to John D. - $625 (Mattie) - 1 hour ago        ││
│  │ ✅ Mike R. subscription renewed - $700 (Kate) - 3 hours ago ││
│  │ ❌ Payment failed for Lisa T. - Card declined - yesterday   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Quick Actions                                                   │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│  │ + New Client   │ │ + Payment Link │ │ 📊 View Reports │       │
│  └────────────────┘ └────────────────┘ └────────────────┘       │
│                                                                  │
│  Lexie sees everything Kate sees (full admin access).           │
│  She can run payroll reports, manage all trainers, etc.         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 8. Trainer Dashboard (Mattie's View - Limited)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏋️ Body Biz                              Mattie ▼  [Logout]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ $4,050       │ │ 6            │ │ 1            │             │
│  │ My Revenue   │ │ My Clients   │ │ Pending      │             │
│  │ This Month   │ │              │ │ Link         │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  My Commission This Month: $2,835 (70%)                         │
│                                                                  │
│  My Clients                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Name          │ Program              │ Status    │ Actions  ││
│  ├───────────────┼──────────────────────┼───────────┼──────────┤│
│  │ John Davis    │ 3 Month Coaching     │ Pending   │ [Resend] ││
│  │ Amy Chen      │ 3 Month Coaching     │ Active    │ [Charge] ││
│  │ Dan Brown     │ Nutrition Only       │ Active    │ [Charge] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [+ Add Client]  [+ Create Payment Link]                        │
│                                                                  │
│  Mattie only sees her own clients. No access to reports,        │
│  other trainers, or admin functions.                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 9. Admin Reports - Commission Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Reports > Commission Breakdown                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  January 2026                              [◀ Prev] [Next ▶]    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Total Revenue: $12,450                                      ││
│  │                                                              ││
│  │ Kate's Total Income:                                        ││
│  │   From her own clients: $3,500 (100%)                       ││
│  │   30% cut from others:  $2,685                              ││
│  │   Total: $6,185                                             ││
│  │                                                              ││
│  │ Trainer Payouts: $6,265                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  By Trainer                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Trainer    │ Clients │ Revenue  │ Their Cut  │ Kate's Cut  ││
│  ├────────────┼─────────┼──────────┼────────────┼─────────────┤│
│  │ Kate       │ 5       │ $3,500   │ 100%=$3,500│ —           ││
│  │ Lexie      │ 8       │ $4,900   │ 70%=$3,430 │ 30%=$1,470  ││
│  │ Mattie     │ 6       │ $4,050   │ 70%=$2,835 │ 30%=$1,215  ││
│  ├────────────┼─────────┼──────────┼────────────┼─────────────┤│
│  │ TOTAL      │ 19      │ $12,450  │ $9,765     │ $2,685      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Kate's Total: $3,500 (own) + $2,685 (cuts) = $6,185            │
│                                                                  │
│  [📥 Export CSV]                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Payment Flows

### Flow 1: New Client (No Card on File)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Staff   │     │  System  │     │  Stripe  │     │  Client  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Fill form      │                │                │
     │ (name, email,  │                │                │
     │  program, $)   │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ Create         │                │
     │                │ Checkout       │                │
     │                │ Session        │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │<───────────────│                │
     │                │ Session URL    │                │
     │                │                │                │
     │                │ Save to DB:    │                │
     │                │ - client (new) │                │
     │                │ - purchase     │                │
     │                │   (pending)    │                │
     │                │ - payment_link │                │
     │                │   (active)     │                │
     │                │                │                │
     │<───────────────│                │                │
     │ Display link   │                │                │
     │                │                │                │
     │ Copy & send    │                │                │
     │ link to client │────────────────────────────────>│
     │                │                │                │
     │                │                │                │ Click link
     │                │                │<───────────────│
     │                │                │                │
     │                │                │ Hosted         │
     │                │                │ Checkout       │
     │                │                │<──────────────>│
     │                │                │                │
     │                │                │ Card saved     │
     │                │                │ Payment done   │
     │                │                │                │
     │                │ Webhook:       │                │
     │                │ checkout.      │                │
     │                │ session.       │                │
     │                │ completed      │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ Update DB:     │                │
     │                │ - purchase     │                │
     │                │   (active)     │                │
     │                │ - payment_link │                │
     │                │   (used)       │                │
     │                │ - client.      │                │
     │                │   stripe_id    │                │
     │                │                │                │
     │                │ Send email     │                │
     │                │───────────────────────────────>│
     │                │ (receipt)      │                │
     │                │                │                │
```

### Flow 2: Recharge Existing Client (Card on File)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Staff   │     │  System  │     │  Stripe  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ View client    │                │
     │ profile        │                │
     │───────────────>│                │
     │                │                │
     │<───────────────│                │
     │ Client + saved │                │
     │ payment methods│                │
     │                │                │
     │ Click "New     │                │
     │ Charge"        │                │
     │───────────────>│                │
     │                │                │
     │ Select program,│                │
     │ amount, card   │                │
     │───────────────>│                │
     │                │                │
     │                │ Create         │
     │                │ Subscription   │
     │                │ (or PaymentInt │
     │                │  for one-time) │
     │                │───────────────>│
     │                │                │
     │                │<───────────────│
     │                │ Success        │
     │                │                │
     │                │ Save purchase  │
     │                │ (active)       │
     │                │                │
     │                │ Send receipt   │
     │                │ email          │
     │                │                │
     │<───────────────│                │
     │ "Charge        │                │
     │  successful"   │                │
     │                │                │
```

### Flow 3: Refund

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │     │  System  │     │  Stripe  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ Find purchase, │                │
     │ click Refund   │                │
     │───────────────>│                │
     │                │                │
     │ Confirm:       │                │
     │ Full/Partial?  │                │
     │ Amount?        │                │
     │───────────────>│                │
     │                │                │
     │                │ Create Refund  │
     │                │───────────────>│
     │                │                │
     │                │<───────────────│
     │                │ Refund ID      │
     │                │                │
     │                │ Update purchase│
     │                │ status         │
     │                │                │
     │                │ Log to         │
     │                │ audit_log      │
     │                │                │
     │<───────────────│                │
     │ "Refund        │                │
     │  processed"    │                │
     │                │                │
```

### Flow 4: Subscription Renewal (Automatic)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Stripe  │     │  System  │     │  Client  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ invoice.paid   │                │
     │ webhook        │                │
     │───────────────>│                │
     │                │                │
     │                │ Verify sub ID  │
     │                │ matches        │
     │                │ purchase       │
     │                │                │
     │                │ Log payment    │
     │                │ to audit_log   │
     │                │                │
     │                │ Send renewal   │
     │                │ receipt email  │
     │                │───────────────>│
     │                │                │
```

### Flow 5: Failed Payment

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Stripe  │     │  System  │     │  Staff   │     │  Client  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ invoice.       │                │                │
     │ payment_failed │                │                │
     │ webhook        │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ Update         │                │
     │                │ purchase       │                │
     │                │ status='failed'│                │
     │                │                │                │
     │                │ Send alert     │                │
     │                │ to trainer     │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │ Send "update   │                │
     │                │ payment" email │                │
     │                │───────────────────────────────>│
     │                │                │                │
```

---

## Email Automations

### Email Triggers

| Trigger                      | Recipient         | Template                  |
| ---------------------------- | ----------------- | ------------------------- |
| `checkout.session.completed` | Client            | Welcome + Receipt         |
| `invoice.paid` (renewal)     | Client            | Renewal Receipt           |
| `invoice.payment_failed`     | Client + Trainer  | Payment Failed            |
| Payment link created         | Client (optional) | Payment Link              |
| Manual charge successful     | Client            | Receipt                   |
| Refund processed             | Client            | Refund Confirmation       |
| Subscription cancelled       | Client            | Cancellation Confirmation |

### Email Templates (Resend)

**Welcome + Receipt:**

```
Subject: Welcome to The Body Biz! 🏋️

Hi {client_name},

Thank you for signing up for {program_name} with {trainer_name}!

Your subscription:
• Program: {program_name}
• Amount: ${amount}/month
• Duration: {duration} months
• Start Date: {start_date}

Your card ending in {card_last4} will be charged ${amount} on the
{billing_day} of each month.

Questions? Reply to this email or contact your trainer directly.

Let's get to work!
The Body Biz Team
```

**Payment Failed:**

```
Subject: Action Required: Payment Failed for The Body Biz

Hi {client_name},

We weren't able to process your payment of ${amount} for {program_name}.

Please update your payment method to continue your program:
{update_payment_url}

If you have questions, reach out to {trainer_name} or reply to this email.

The Body Biz Team
```

---

## Security

### Authentication

- Supabase Auth with email/password
- Magic link option for easier staff onboarding
- Session-based auth (JWT stored in httpOnly cookie)

### Authorization

- Row Level Security (RLS) in Supabase
- API route middleware checks user role before operations
- Trainer can only access their assigned clients
- Admin has full access

### Data Protection

- All traffic over HTTPS (Vercel + Stripe)
- No credit card numbers stored in your database (Stripe handles PCI compliance)
- Stripe Customer ID stored as reference only
- Webhook signature verification on all Stripe webhooks

### Webhook Security

```typescript
// /api/webhook/route.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  // Handle event...
}
```

### Audit Logging

- All sensitive operations logged to `audit_log` table
- Includes: user_id, action, entity, timestamp, IP address
- Enables debugging and compliance

---

## Migration Plan

### Phase 1: Build & Test (Weeks 1-3)

1. Set up Stripe account (test mode)
2. Set up Supabase project
3. Build core dashboard (clients, payments)
4. Test all payment flows in Stripe test mode
5. Internal testing with dummy data

### Phase 2: Parallel Run (Week 4)

1. Switch Stripe to live mode
2. Manually import existing active clients to new system
3. Lexie uses new system for HER clients only
4. Foxy continues for everyone else
5. Monitor for issues

### Phase 3: Full Migration (Week 5+)

1. Import remaining clients
2. Train Kate and other staff
3. Disable Foxy payment links
4. Keep Foxy read-only for historical records
5. Optional: Export Foxy data to new system for history

### Data Migration Checklist

- [ ] Export client list from Foxy
- [ ] Export transaction history from Foxy
- [ ] Map clients to trainers
- [ ] Create Stripe customers for active clients
- [ ] Import to Supabase
- [ ] Verify data integrity

---

## Tech Stack Details

### Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.x",
    "@supabase/auth-helpers-nextjs": "^0.x",
    "stripe": "^14.x",
    "resend": "^2.x",
    "zod": "^3.x",
    "date-fns": "^3.x",
    "react-hook-form": "^7.x",
    "@tanstack/react-query": "^5.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "@types/node": "^20.x",
    "@types/react": "^18.x"
  }
}
```

### Project Structure

```
/app
  /api
    /webhook
      route.ts          # Stripe webhooks
    /clients
      route.ts          # CRUD
      [id]/route.ts
    /payments
      route.ts          # Create charges, links
      [id]/route.ts
    /trainers
      route.ts
  /(dashboard)
    /layout.tsx         # Auth wrapper, sidebar
    /page.tsx           # Dashboard home
    /clients
      /page.tsx         # Client list
      /[id]/page.tsx    # Client profile
      /new/page.tsx     # Add client
    /payments
      /page.tsx         # Payment history
      /links/page.tsx   # Pending links
    /reports
      /page.tsx         # Revenue reports
    /team
      /page.tsx         # Trainer management
    /settings
      /page.tsx
  /(auth)
    /login/page.tsx
/components
  /ui                   # Shared components
  /clients              # Client-specific components
  /payments             # Payment-specific components
/lib
  /stripe.ts            # Stripe client setup
  /supabase.ts          # Supabase client setup
  /email.ts             # Resend helpers
  /utils.ts
/types
  /database.ts          # Supabase types (generated)
  /index.ts
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

### Stripe Configuration

**Products to Create:**

1. "Personal Coaching" - base product, price varies
2. "Nutrition Coaching" - base product
3. "VO2/RMR Testing" - one-time product

**Checkout Session Settings:**

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription", // or 'payment' for one-time
  customer_email: client.email,
  line_items: [
    {
      price_data: {
        currency: "usd",
        product: productId,
        unit_amount: amount * 100, // cents
        recurring: { interval: "month" },
      },
      quantity: 1,
    },
  ],
  subscription_data: {
    metadata: {
      purchase_id: purchase.id,
      trainer_id: trainer.id,
      client_id: client.id,
    },
  },
  payment_intent_data: {
    setup_future_usage: "off_session", // Save card for recharges
  },
  success_url: `${APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/payments/cancelled`,
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
});
```

---

## Decisions Made

| Question                   | Answer                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Where does this live?**  | `bodybiz-admin.vercel.app` (free Vercel tier for now)                                                         |
| **Kate's commission**      | 100% on her own clients. 30% cut from all other trainers' clients.                                            |
| **The $210 testing fee**   | Separate add-on product. One-time charge. Commonly added for new clients but not required.                    |
| **Historical data**        | Will attempt to import from Foxy, but not blocking MVP.                                                       |
| **Client self-service**    | No client accounts. Clients only interact via payment links and email receipts. All management through staff. |
| **Webflow marketing site** | Keep it. No need to rebuild. Focus on the dashboard.                                                          |

---

## Future Considerations (Not MVP)

1. **Rebuild marketing site in Next.js** — Only if Webflow becomes a pain point
2. **Stripe Connect for auto-payouts** — Currently Kate pays trainers manually based on reports
3. **Client self-service portal** — Clients could update their own cards (would require accounts)
4. **SMS notifications** — Text clients about payment links, renewals
5. **Mobile app** — If staff wants to manage from phones

---

## Next Steps

1. [ ] Review this spec, flag any questions
2. [ ] Set up Stripe account (can use Kate's existing Authorize credentials to verify identity)
3. [ ] Set up Supabase project
4. [ ] Start building core client management
5. [ ] Show Lexie progress, get feedback
6. [ ] Iterate until solid
7. [ ] Parallel run with real data
8. [ ] Full migration
