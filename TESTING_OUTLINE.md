# Body Biz Testing Outline

**Last Updated:** 2026-01-07
**Milestones Completed:** M0-M4 (Foundation through Reports)

---

## Prerequisites

### 1. Start Development Server

```bash
npm run dev
```

App should be running at `http://localhost:3000`

### 2. Start Stripe CLI (for webhook testing)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Keep this terminal open - it will show webhook events as they come in.

### 3. Test Cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry date (e.g., `12/28`) and any 3-digit CVC.

---

## Test Users

You should have these users seeded in your Supabase `users` table:

| Role | Name | Email | What They See |
|------|------|-------|---------------|
| Admin | Kate | (your test email) | Everything, 100% commission |
| Manager | Lexie | (your test email) | Everything, 70% commission |
| Trainer | Mattie | (your test email) | Own clients only, 70% commission |

If not seeded, you'll need to create them via Supabase dashboard.

---

## Test Sections

### [A] Authentication & Login

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| A1 | Access protected route without login | Go to `localhost:3000/clients` | Redirected to `/login` |
| A2 | Login with valid credentials | Enter email/password, click Login | Redirected to dashboard |
| A3 | Login with invalid credentials | Enter wrong password | Error message shown |
| A4 | Logout | Click user menu, click Logout | Redirected to login page |
| A5 | Session persists on refresh | Refresh page while logged in | Still logged in |

---

### [B] Dashboard Home

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| B1 | Dashboard loads | Navigate to `/` or `/dashboard` | Page loads without errors |
| B2 | Stats cards visible | Look at top of dashboard | See stat cards (may be placeholder data) |
| B3 | Navigation works | Click each nav item | Pages load correctly |
| B4 | Role-based nav | Login as trainer | Should NOT see Reports, Team, Programs in nav |

---

### [C] Client Management

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| C1 | View client list | Go to `/clients` | Client list loads |
| C2 | Search clients | Type in search box | List filters by name/email |
| C3 | Filter by trainer | Select trainer from dropdown | Only that trainer's clients shown |
| C4 | Add new client | Click "Add Client", fill form, submit | Client created, appears in list |
| C5 | Required field validation | Submit form without name | Validation error shown |
| C6 | View client profile | Click on a client | Profile page loads with details |
| C7 | Edit client | Click Edit, change name, save | Name updated |
| C8 | Delete client | Click Delete, confirm | Client removed from list (soft delete) |

**Trainer-specific tests:**
| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| C9 | Trainer sees only own clients | Login as Mattie, go to `/clients` | Only Mattie's assigned clients visible |
| C10 | Trainer can't access other clients | Manually go to URL `/clients/[other-client-id]` | Access denied or 404 |

---

### [D] Payment Links (New Client Flow)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| D1 | Access payment link form | Go to `/payments/new` | Form loads with all fields |
| D2 | Create link for new client | Fill out: name, email, program, amount, trainer | Form submits |
| D3 | Link generated | After submit | Modal shows Stripe Checkout URL |
| D4 | Copy link | Click "Copy" button | Link copied to clipboard |
| D5 | Link works | Open link in incognito browser | Stripe Checkout page loads |
| D6 | Complete payment | Use test card `4242...`, complete checkout | Redirected to success page |
| D7 | Webhook received | Check Stripe CLI terminal | `checkout.session.completed` event shown |
| D8 | Purchase status updated | Check client profile | Purchase shows status "active" |
| D9 | Client has Stripe ID | Check client record | `stripe_customer_id` is populated |
| D10 | Payment link marked used | Check payment_links table | Status = "used", used_at has timestamp |

---

### [E] Recharge Existing Client (Saved Card)

**Prerequisites:** Have a client who completed a payment link (has `stripe_customer_id`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| E1 | View client with saved card | Go to client profile | "New Charge" button visible |
| E2 | Open New Charge modal | Click "New Charge" | Modal opens |
| E3 | Payment methods load | Wait for modal | Saved cards shown (e.g., "Visa •••• 4242") |
| E4 | Select program | Choose from dropdown | Amount auto-fills from program default |
| E5 | Custom amount | Change the amount | New amount accepted |
| E6 | Duration options | Select duration | Ongoing or 1-12 months available |
| E7 | Commission preview | Look at bottom of modal | Shows "Trainer (70%): $X" and "Owner (30%): $Y" |
| E8 | Successful charge | Click "Charge", confirm | Success message shown |
| E9 | Purchase record created | Check client profile | New purchase in history |
| E10 | Stripe subscription created | Check Stripe Dashboard > Subscriptions | New subscription exists |

**Error cases:**
| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| E11 | Declined card | Use card `4000 0000 0000 0002` (or change default card to a failing one) | Error message shown, no purchase created |
| E12 | Client without saved card | View client with no `stripe_customer_id` | "New Charge" shows message to create payment link instead |

---

### [F] Reports & Commissions (Admin/Manager Only)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| F1 | Access reports page | Go to `/reports` | Page loads (admin/manager only) |
| F2 | Trainer blocked | Login as trainer, go to `/reports` | Access denied or redirect |
| F3 | Current pay period auto-selected | Open reports | Correct half of month selected |
| F4 | Summary cards show data | Look at top cards | Total Revenue, Trainer Payouts, Kate's Income shown |
| F5 | Commission table loads | Scroll to table | Trainers listed with revenue breakdown |
| F6 | Commission math correct | Check a trainer row | 70%/30% split is accurate |
| F7 | Kate shows 100% | Find Kate in table | Shows 100% commission, $0 in "Kate's Cut" column |
| F8 | Change date range | Select "This Month" | Data refreshes for full month |
| F9 | Custom date range | Select "Custom", enter dates | Data filters to those dates |
| F10 | Empty state | Pick date range with no purchases | "No purchases found for this period" |
| F11 | CSV export | Click "Export CSV" | File downloads |
| F12 | CSV accuracy | Open downloaded file | Data matches table, includes totals row |

---

### [G] Stripe Webhooks

**Note:** These require the Stripe CLI running (`stripe listen --forward-to ...`)

| # | Test | Event | Expected Behavior |
|---|------|-------|-------------------|
| G1 | Checkout completed | `checkout.session.completed` | Purchase → active, link → used |
| G2 | Invoice paid (renewal) | `invoice.paid` | Logged to console/audit |
| G3 | Payment failed | `invoice.payment_failed` | Purchase → failed |
| G4 | Subscription cancelled | `customer.subscription.deleted` | Purchase → cancelled |

**How to trigger webhooks manually:**
- G1: Complete a payment link
- G2: Wait for subscription renewal (or trigger via Stripe Dashboard > Test Clocks)
- G3: Use Stripe Dashboard to fail an invoice
- G4: Cancel a subscription in Stripe Dashboard

---

### [H] API Endpoints (Direct Testing)

You can test these with curl or Postman. Requires auth cookie from logged-in session.

| Endpoint | Method | Test |
|----------|--------|------|
| `/api/clients` | GET | Returns client list |
| `/api/clients` | POST | Creates new client |
| `/api/clients/[id]` | GET | Returns single client |
| `/api/clients/[id]` | PATCH | Updates client |
| `/api/clients/[id]` | DELETE | Soft deletes client |
| `/api/clients/[id]/payment-methods` | GET | Returns Stripe payment methods |
| `/api/programs` | GET | Returns program list |
| `/api/payments/checkout` | POST | Creates Stripe Checkout session |
| `/api/payments/charge` | POST | Charges saved payment method |
| `/api/reports/commissions` | GET | Returns commission data |
| `/api/webhooks/stripe` | POST | (Stripe only) Webhook handler |

---

## Known Limitations / Not Yet Implemented

These features are planned for Milestone 5:

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard real stats | Pending | Currently shows placeholder data |
| Email confirmations | Pending | Resend integration not wired up |
| Team management | Pending | No `/team` page yet |
| Program management | Pending | No `/programs` page yet |
| Failed payment handling UI | Pending | No retry button yet |
| Subscription pause/resume/cancel | Pending | No UI for this yet |
| Audit logging | Pending | Table exists, writes may be incomplete |

---

## Bug Tracking

Use this section to note any bugs found during testing:

| # | Description | Steps to Reproduce | Severity | Status |
|---|-------------|--------------------|----------|--------|
| - | - | - | - | - |

---

## Testing Checklist Summary

```
[ ] A. Authentication (5 tests)
[ ] B. Dashboard (4 tests)
[ ] C. Client Management (10 tests)
[ ] D. Payment Links (10 tests)
[ ] E. Recharge Clients (12 tests)
[ ] F. Reports (12 tests)
[ ] G. Webhooks (4 tests)
[ ] H. API Endpoints (11 endpoints)
```

---

## Quick Reference

### Stripe Test Mode

- Dashboard: https://dashboard.stripe.com/test
- Webhook events visible in: Stripe CLI terminal + Dashboard > Developers > Webhooks

### Supabase

- Dashboard: (your project URL)
- Check data: Table Editor
- Check RLS: Authentication > Policies

### Useful URLs

| Page | URL |
|------|-----|
| Login | `/login` |
| Dashboard | `/` |
| Clients | `/clients` |
| Add Client | `/clients/new` |
| Client Profile | `/clients/[id]` |
| Payments | `/payments` |
| Create Payment Link | `/payments/new` |
| Reports | `/reports` |

---

*Happy testing!*
