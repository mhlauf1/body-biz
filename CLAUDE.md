# Body Biz Client Management System

## Project Goals

**What:** Internal dashboard for The Body Biz (Columbus, OH personal training studio)
**Why:** Replace fragmented Foxy.io + Authorize.net + Zapier + Google Sheets with unified Stripe-powered system
**Who:** Built by Lauf (lauf.co) for The Body Biz (thebody.biz)

### Core Problems We're Solving
- Recharging existing clients requires new payment links (should be one-click)
- Commission tracking is manual spreadsheet hell (should be automatic)
- No client history, duplicate charges happen (need unified client profiles)
- Zapier automations break constantly (need reliable webhook-based system)

### Success Metrics
- Staff can charge existing clients in <30 seconds
- Zero manual commission calculations
- Complete client history in one place

---

## Architecture Overview

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (Postgres + Auth + RLS) |
| Payments | Stripe (Checkout, Subscriptions, saved cards) |
| Email | Resend |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |

### Folder Structure
```
/app
  /api                → API routes (webhooks, CRUD)
    /webhooks/stripe  → Stripe webhook handler
    /clients          → Client CRUD
    /payments         → Payment operations
    /reports          → Commission reports
  /(auth)             → Login pages (outside dashboard layout)
  /(dashboard)        → Main app (auth-protected)
    /clients          → Client management
    /payments         → Payment history & links
    /reports          → Revenue & commission reports
  /(public)           → Client-facing pages (no auth required)
    /payments         → Success/cancelled pages after checkout
/components
  /ui                 → Shared components (Button, Input, Card, Modal, SearchableSelect, etc.)
  /clients            → Client-specific components
  /payments           → Payment-specific components
  /reports            → Report-specific components
/lib
  /supabase.ts        → Supabase client setup
  /stripe.ts          → Stripe client setup
  /utils.ts           → Helpers (formatCurrency, calcCommission)
  /auth.ts            → Auth helpers
  /dateRanges.ts      → Pay period calculations
/types
  /database.ts        → Generated Supabase types
/docs                 → Project documentation
/scripts              → Utility scripts (password setup, etc.)
```

### User Roles
| Role | Who | Access | Commission |
|------|-----|--------|------------|
| `admin` | Kate | Everything | 100% own clients, 30% cut from others |
| `manager` | Lexie | Everything (same as admin) | 70% (Kate gets 30%) |
| `trainer` | Mattie, others | Own clients only | 70% (Kate gets 30%) |

**Key:** Manager has admin ACCESS but trainer COMMISSION.

---

## Design Style Guide

### Visual Style
- **Aesthetic:** Clean minimal (Stripe-like)
- **Backgrounds:** White/light gray
- **Borders:** Subtle gray (`border-gray-200`)
- **Typography:** Clear hierarchy, system fonts
- **Shadows:** Minimal, only for elevation (modals, dropdowns)
- **Colors:**
  - Primary: Indigo/blue for actions
  - Success: Green for completed/active states
  - Warning: Yellow/amber for pending
  - Error: Red for failures/alerts

### Component Patterns
- Build all UI components from scratch with Tailwind CSS v4
- No external component libraries
- Consistent padding/spacing (use Tailwind's spacing scale)
- Accessible: proper labels, focus states, ARIA attributes

### UX Guidelines
- Server Components by default, Client Components only when needed
- Show loading states for async operations
- Optimistic updates where appropriate
- Clear error messages (user-friendly in UI, detailed in logs)
- Confirm destructive actions (delete, refund, cancel)

---

## Constraints & Policies

### Security (MUST follow)
- NEVER log full card numbers or Stripe secrets
- NEVER commit `.env` files or secrets to git
- ALWAYS verify Stripe webhook signatures before processing
- ALWAYS use Supabase RLS — don't trust client-side role checks alone
- ALWAYS use environment variables for secrets
- Trainers can only access their own clients (enforced at DB level)

### Code Quality
- Validate all inputs with Zod
- Use try/catch around Stripe and Supabase calls
- API routes return `{ error: string }` on failure with appropriate status
- Log sensitive operations to `audit_log` table

### Naming Conventions
- API routes: `/api/clients`, `/api/payments`, `/api/webhooks/stripe`
- Components: PascalCase (`ClientList.tsx`)
- Utils/hooks: camelCase (`formatCurrency.ts`, `useAuth.ts`)
- Database: snake_case (`stripe_customer_id`)

---

## Repository Etiquette

### Git Workflow
- **NEVER push directly to main branch**
- Create feature branches for all work
- Open PRs for review before merging
- Keep commits atomic and well-described

### Branch Naming
```
feature/client-list-page
feature/stripe-webhook-handler
fix/commission-calculation-bug
docs/update-architecture
chore/update-dependencies
```

### Commit Messages
- Use conventional commit style
- Be descriptive but concise
- Reference issue numbers when applicable

### PR Process
1. Create feature branch from main
2. Make changes with atomic commits
3. Open PR with description of changes
4. Review and merge (squash if many small commits)

---

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)

# Build & Deploy
npm run build        # Production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint

# Database (Supabase)
# Generate types after schema changes:
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

---

## MCP Servers

This project has three MCP (Model Context Protocol) servers configured in `.mcp.json`:

| Server | Purpose | Package |
|--------|---------|---------|
| **stripe** | Manage customers, products, subscriptions, payments | `@stripe/mcp` |
| **supabase** | Database queries, table management, edge functions | `@supabase/mcp` |
| **playwright** | Browser automation, E2E testing, UI verification | `@playwright/mcp` |

### Usage
- MCPs are automatically available in Claude Code sessions
- Use `/mcp` to check server status
- Stripe and Supabase require env vars to be set in `.env.local`

### When to Use
- **Stripe MCP**: Creating products, managing customers, testing payments
- **Supabase MCP**: Running queries, checking schema, debugging data issues
- **Playwright MCP**: Testing UI flows, verifying frontend behavior, E2E tests

---

## Testing Instructions

### Local Development
1. Copy `.env.example` to `.env.local` and fill in values
2. Run `npm run dev`
3. Access dashboard at `http://localhost:3000`

### Testing Payment Flows
- Use Stripe test mode (test API keys in `.env.local`)
- Test card: `4242 4242 4242 4242` (any future expiry, any CVC)
- Use Stripe CLI for webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Testing User Roles
- Test with different role accounts to verify RLS policies
- Admin/Manager should see all data
- Trainers should only see their assigned clients

---

## Documentation References

| Doc | Purpose |
|-----|---------|
| [Project Spec](docs/project_spec.md) | Full requirements, API specs, database schema |
| [Architecture](docs/architecture.md) | System design, data flow, component relationships |
| [Changelog](docs/changelog.md) | Version history, feature additions |
| [Project Status](docs/project_status.md) | Current progress, milestones |

**Update docs after major milestones** using `/update-docs-and-commit` command.

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Quick Reference

### Commission Logic
```typescript
if (trainer.role === "admin") {
  trainer_commission_rate = 1.0;   // Kate keeps 100%
  trainer_amount = amount;
  owner_amount = 0;
} else {
  trainer_commission_rate = 0.7;   // Others get 70%
  trainer_amount = amount * 0.7;
  owner_amount = amount * 0.3;     // Kate gets 30%
}
```

### Database Tables
- `users` — Staff/trainers with role and commission_rate
- `clients` — Clients with stripe_customer_id for saved cards
- `programs` — Templates (3 Month Coaching, Testing Fee, etc.)
- `purchases` — Transactions with commission breakdown
- `payment_links` — One-time use, auto-expire checkout links
- `audit_log` — Track all sensitive operations

See [Project Spec](docs/project_spec.md) for full schema.
