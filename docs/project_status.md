# Project Status

## Current Phase
**Milestone 2: Client Management + Payment Links** (Complete)

## Overall Progress
```
Milestone 0: Setup & Docs     [==========] 100% ✓
Milestone 1: Foundation       [==========] 100% ✓
Milestone 2: Payment Links    [==========] 100% ✓
Milestone 3: Recharge         [----------] 0%
Milestone 4: Client Profile   [----------] 0%
Milestone 5: Reports          [----------] 0%
Milestone 6: Polish           [----------] 0%
```

---

## Milestone Breakdown

### Milestone 0: Project Setup & Documentation Structure
**Status:** Complete

| Task | Status |
|------|--------|
| Restructure CLAUDE.md | Done |
| Create docs/architecture.md | Done |
| Create docs/changelog.md | Done |
| Create docs/project_status.md | Done |
| Rename SPEC.md to project_spec.md | Done |
| Create /update-docs-and-commit skill | Done |
| Set up Stripe MCP | Done |
| Set up Supabase MCP | Done |
| Set up Playwright MCP | Done |

---

### Milestone 1: Foundation & Database
**Status:** Complete

| Task | Status |
|------|--------|
| Create Supabase database schema | Done |
| Generate TypeScript types | Done |
| Set up Supabase client helpers | Done |
| Set up Stripe client | Done |
| Create utility functions | Done |
| Build base UI components | Done |
| Create auth pages (login) | Done |
| Create dashboard layout | Done |
| Seed initial users | Done |
| Seed initial programs | Done |

---

### Milestone 2: Client Management + Payment Links
**Status:** Complete

| Task | Status |
|------|--------|
| Build client list page | Done |
| Build add client form | Done |
| Build client profile page | Done |
| Create payment link form | Done |
| API: Create Stripe Checkout Session | Done |
| Store pending purchase + link | Done |
| Display generated link | Done |
| Stripe webhook handler | Done |
| Handle checkout.session.completed | Done |
| Commission calculation | Done |

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
**Status:** Not Started

| Task | Status |
|------|--------|
| Fetch saved payment methods | Pending |
| "New Charge" modal | Pending |
| API: Charge saved card | Pending |
| Handle ongoing vs fixed-term | Pending |
| Webhook: invoice.paid | Pending |

---

### Milestone 4: Purchase History & Client Profile
**Status:** Partially Done (merged into M2)

| Task | Status |
|------|--------|
| Display purchase history | Done |
| Show subscription status | Done |
| Notes field (editable) | Done |
| Show payment methods | Pending |
| Client edit functionality | Done |

---

### Milestone 5: Admin Reports & Commission Tracking
**Status:** Not Started

| Task | Status |
|------|--------|
| Reports page | Pending |
| Revenue overview | Pending |
| Commission breakdown by trainer | Pending |
| Date range filter | Pending |
| Export to CSV | Pending |

---

### Milestone 6: Polish & Secondary Features
**Status:** Not Started

| Task | Status |
|------|--------|
| Dashboard home with stats | Pending |
| Recent activity feed | Pending |
| Team management | Pending |
| Program management | Pending |
| Email confirmations (Resend) | Pending |
| Handle failed payments | Pending |
| Pause/resume/cancel subscriptions | Pending |
| Audit logging | Pending |

---

## Key Dates

| Event | Date |
|-------|------|
| Project started | 2025-01-06 |
| Milestone 0 completed | 2025-01-07 |
| Milestone 1 completed | 2025-01-07 |
| Milestone 2 completed | 2026-01-07 |
| Milestone 3 target | TBD |
| MVP complete (Milestone 5) | TBD |

---

## Blockers & Notes

- None currently
- MCP servers configured: Stripe, Supabase, Playwright

---

## Test User
- Email: `mhlauf1@gmail.com` (for all roles during development)
- Will switch to real emails before production

---

*Last updated: 2026-01-07*
