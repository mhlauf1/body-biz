# Project Status

## Current Phase

**Milestone 4: Reports** (Complete)

## Overall Progress

```
Milestone 0: Setup & Docs     [==========] 100% ✓
Milestone 1: Foundation       [==========] 100% ✓
Milestone 2: Payment Links    [==========] 100% ✓
Milestone 3: Recharge         [==========] 100% ✓
Milestone 4: Reports          [==========] 100% ✓
Milestone 5: Polish           [----------] 0%
```

---

## Milestone Breakdown

### Milestone 0: Project Setup & Documentation Structure

**Status:** Complete

| Task                                 | Status |
| ------------------------------------ | ------ |
| Restructure CLAUDE.md                | Done   |
| Create docs/architecture.md          | Done   |
| Create docs/changelog.md             | Done   |
| Create docs/project_status.md        | Done   |
| Rename SPEC.md to project_spec.md    | Done   |
| Create /update-docs-and-commit skill | Done   |
| Set up Stripe MCP                    | Done   |
| Set up Supabase MCP                  | Done   |
| Set up Playwright MCP                | Done   |

---

### Milestone 1: Foundation & Database

**Status:** Complete

| Task                            | Status |
| ------------------------------- | ------ |
| Create Supabase database schema | Done   |
| Generate TypeScript types       | Done   |
| Set up Supabase client helpers  | Done   |
| Set up Stripe client            | Done   |
| Create utility functions        | Done   |
| Build base UI components        | Done   |
| Create auth pages (login)       | Done   |
| Create dashboard layout         | Done   |
| Seed initial users              | Done   |
| Seed initial programs           | Done   |

---

### Milestone 2: Client Management + Payment Links

**Status:** Complete

| Task                                | Status |
| ----------------------------------- | ------ |
| Build client list page              | Done   |
| Build add client form               | Done   |
| Build client profile page           | Done   |
| Create payment link form            | Done   |
| API: Create Stripe Checkout Session | Done   |
| Store pending purchase + link       | Done   |
| Display generated link              | Done   |
| Stripe webhook handler              | Done   |
| Handle checkout.session.completed   | Done   |
| Commission calculation              | Done   |

**New files created:**

- `app/api/clients/route.ts` - Client CRUD API
- `app/api/clients/[id]/route.ts` - Single client operations
- `app/api/payments/checkout/route.ts` - Stripe checkout session creation
- `app/api/programs/route.ts` - Programs listing
- `app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `app/(dashboard)/clients/page.tsx` - Client list page
- `app/(dashboard)/clients/new/page.tsx` - New client page
- `app/(dashboard)/clients/[id]/page.tsx` - Client profile page
- `app/(dashboard)/payments/page.tsx` - Payments overview
- `app/(dashboard)/payments/new/page.tsx` - Create payment link
- `app/(dashboard)/payments/success/page.tsx` - Payment success page
- `app/(dashboard)/payments/cancelled/page.tsx` - Payment cancelled page
- `components/clients/ClientList.tsx` - Client list component
- `components/clients/ClientForm.tsx` - Client form component
- `components/clients/ClientCard.tsx` - Client profile card
- `components/payments/PaymentLinkForm.tsx` - Payment link form

---

### Milestone 3: Recharge Existing Clients

**Status:** Complete

| Task                         | Status |
| ---------------------------- | ------ |
| Fetch saved payment methods  | Done   |
| "New Charge" modal           | Done   |
| API: Charge saved card       | Done   |
| Handle ongoing vs fixed-term | Done   |
| Webhook: invoice.paid        | Done   |
| Show payment methods in UI   | Done   |

**New files created:**

- `app/api/clients/[id]/payment-methods/route.ts` - Fetch saved cards from Stripe
- `app/api/payments/charge/route.ts` - Charge saved payment method
- `components/payments/NewChargeModal.tsx` - Modal for one-click recharge
- `components/clients/ClientQuickActions.tsx` - Quick action buttons on profile

---

### Milestone 4: Reports & Commission Tracking

**Status:** Complete

| Task                            | Status |
| ------------------------------- | ------ |
| Date range utilities            | Done   |
| Reports API route               | Done   |
| Summary cards component         | Done   |
| Commission breakdown table      | Done   |
| Date range selector             | Done   |
| Export to CSV                   | Done   |

**New files created:**

- `lib/dateRanges.ts` - Pay period and date range utilities
- `app/api/reports/commissions/route.ts` - Commission report API
- `app/(dashboard)/reports/page.tsx` - Reports page
- `components/reports/SummaryCards.tsx` - Summary stat cards
- `components/reports/DateRangeSelector.tsx` - Period selector
- `components/reports/CommissionTable.tsx` - Trainer breakdown table
- `components/reports/ExportButton.tsx` - CSV export

---

### Milestone 5: Polish & Secondary Features

**Status:** Not Started

| Task                              | Status  |
| --------------------------------- | ------- |
| Dashboard home with stats         | Pending |
| Recent activity feed              | Pending |
| Team management                   | Pending |
| Program management                | Pending |
| Email confirmations (Resend)      | Pending |
| Handle failed payments            | Pending |
| Pause/resume/cancel subscriptions | Pending |
| Audit logging                     | Pending |

---

## Key Dates

| Event                      | Date       |
| -------------------------- | ---------- |
| Project started            | 2025-01-06 |
| Milestone 0 completed      | 2025-01-07 |
| Milestone 1 completed      | 2025-01-07 |
| Milestone 2 completed      | 2026-01-07 |
| Milestone 3 completed      | 2026-01-07 |
| Milestone 4 completed      | 2026-01-07 |
| MVP complete (Milestone 5) | TBD        |

---

## Latest Work: Milestone 4 - Reports & Commission Tracking

### What Was Built

The Reports page (`/reports`) provides commission tracking for Kate and Lexie to manage trainer payroll. Access is restricted to admin/manager roles only.

### Capabilities

**Pay Period Support (Semi-Monthly)**
- First half: 1st - 15th of each month
- Second half: 16th - end of month
- Matches the studio's actual payroll schedule

**Date Range Presets**
| Preset | Description |
|--------|-------------|
| Current Pay Period | Auto-detects which half of the month we're in |
| Previous Pay Period | The pay period before the current one |
| This Month | Full calendar month |
| Last 4 Weeks | Rolling 28-day window |
| This Quarter | Q1/Q2/Q3/Q4 based on current date |
| This Year | Year-to-date |
| Custom | Pick any start/end date |

**Summary Cards**
- **Total Revenue** - All purchases in the selected period
- **Trainer Payouts** - Sum of what trainers are owed (70% for non-admin)
- **Kate's Income** - Her 30% cut from other trainers' clients

**Commission Table**
- Trainer name with role badge (admin/manager/trainer)
- Commission rate shown (100% for Kate, 70% for others)
- Client count per trainer
- Revenue, Their Commission, Kate's Cut columns
- Totals row at bottom
- Sorted by revenue (highest first)

**CSV Export**
- Downloads all data with totals
- Filename includes period (e.g., `commissions-jan-1-15-2026.csv`)
- Ready for payroll processing

### Files Created

```
lib/dateRanges.ts                           # Pay period calculations
app/api/reports/commissions/route.ts        # GET API for report data
app/(dashboard)/reports/page.tsx            # Reports page
components/reports/SummaryCards.tsx         # Top stat cards
components/reports/DateRangeSelector.tsx    # Period picker
components/reports/CommissionTable.tsx      # Main table with fetching
components/reports/ExportButton.tsx         # CSV download
```

---

## What's Next: Milestone 5 - Polish

Priority items for final polish:

| Feature | Description | Priority |
|---------|-------------|----------|
| Dashboard Stats | Replace placeholder stats with real data | High |
| Email Confirmations | Send receipts via Resend on purchase | High |
| Failed Payment Handling | UI to show failed payments, retry options | Medium |
| Team Management | `/team` page to add/edit trainers | Medium |
| Program Management | `/programs` page to add/edit programs | Medium |
| Subscription Actions | Pause/resume/cancel buttons | Low |

---

## How to Test

### Prerequisites

```bash
# 1. Start the dev server
npm run dev

# 2. Start Stripe CLI for webhook testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Test Accounts

| Role | Email | Access |
|------|-------|--------|
| Admin (Kate) | Use your test email | Full access, 100% commission |
| Manager (Lexie) | Use your test email | Full access, 70% commission |
| Trainer (Mattie) | Use your test email | Own clients only, 70% commission |

### Testing M4 - Reports Page

1. **Login as admin or manager**
2. **Navigate to `/reports`**
3. **Verify pay period detection:**
   - If today is 1st-15th, should show that range
   - If today is 16th+, should show 16th-end
4. **Test presets:**
   - Select each preset, verify dates update
   - Check the period label updates correctly
5. **Test custom range:**
   - Select "Custom Range"
   - Enter start/end dates
   - Verify data reloads
6. **Verify commission math:**
   - Kate (admin) should show 100% in "Their Commission"
   - Others should show 70%/30% split
7. **Test CSV export:**
   - Click "Export CSV"
   - Open file, verify totals match table
8. **Test empty state:**
   - Pick a date range with no purchases
   - Should show "No purchases found for this period"

### Testing M3 - Recharge Existing Clients

⚠️ **This was not previously tested - verify before going live!**

1. **Find a client with saved payment method:**
   - Go to `/clients`
   - Click a client who completed checkout before (has `stripe_customer_id`)
2. **Click "New Charge" button**
3. **Verify payment methods load:**
   - Should show saved cards (e.g., "Visa •••• 4242")
4. **Fill out charge form:**
   - Select a program (or "Custom")
   - Enter amount
   - Select duration (Ongoing or 1-12 months)
5. **Verify commission preview:**
   - Should show trainer's cut vs owner's cut
6. **Submit charge:**
   - Check success modal appears
   - Verify purchase shows in client's history
   - Check Stripe dashboard for new subscription
7. **Test decline:**
   - Use card `4000 0000 0000 0002`
   - Should show error message

### Testing M2 - Payment Links

1. **Go to `/payments/new`**
2. **Create link for new client:**
   - Fill in client details
   - Select program/amount
   - Click "Generate Link"
3. **Copy the Stripe Checkout URL**
4. **Open in incognito, complete payment with test card:**
   - Card: `4242 4242 4242 4242`
   - Any future expiry, any CVC
5. **Verify webhook received:**
   - Check Stripe CLI output
   - Check purchase status changed to "active"
   - Check client has `stripe_customer_id` stored

### Webhook Events to Verify

| Event | What Happens | How to Trigger |
|-------|--------------|----------------|
| `checkout.session.completed` | Purchase → active, link → used | Complete a payment link |
| `invoice.paid` | Logs renewal | Wait for subscription renewal (or use Stripe dashboard) |
| `invoice.payment_failed` | Purchase → failed | Use declining test card |
| `customer.subscription.deleted` | Purchase → cancelled | Cancel subscription in Stripe |

---

## Blockers & Notes

- None currently
- MCP servers configured: Stripe, Supabase, Playwright
- M3 (Recharge) built but needs end-to-end testing

---

## Test User

- Email: `mhlauf1@gmail.com` (for all roles during development)
- Will switch to real emails before production

---

_Last updated: 2026-01-07 (M4 Reports completed)_
