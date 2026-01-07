# Changelog

All notable changes to the Body Biz Client Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Recharge existing clients (saved cards)
- Admin reports (revenue, commission breakdown)
- Email confirmations (Resend)

---

## [0.2.0] - 2026-01-07

### Added
- **Client Management**
  - Client list page with search and trainer filter
  - Add new client form with validation
  - Client profile page with details and purchase history
  - Edit and delete client functionality
  - Role-based access (trainers see only their clients)

- **Payment Links**
  - Payment link creation form
  - Stripe Checkout Session integration
  - Payment link success/cancelled pages
  - Pending links display on payments page
  - Copy link to clipboard functionality

- **Stripe Integration**
  - Webhook handler for checkout.session.completed
  - Webhook handler for invoice.paid
  - Webhook handler for invoice.payment_failed
  - Webhook handler for subscription deletion
  - Commission calculation on purchases
  - Stripe customer ID storage on clients

- **API Routes**
  - `GET/POST /api/clients` - List and create clients
  - `GET/PATCH/DELETE /api/clients/[id]` - Client operations
  - `POST /api/payments/checkout` - Create checkout sessions
  - `GET /api/programs` - List available programs
  - `POST /api/webhooks/stripe` - Handle Stripe webhooks

### Technical
- Zod validation on all API inputs
- Audit logging for sensitive operations
- Role-based access control on all endpoints
- Soft delete for clients (is_active flag)

---

## [0.1.0] - 2025-01-07

### Added
- **UI Component Library**
  - Button (primary, secondary, danger, ghost variants)
  - Input with label and error states
  - Select with options
  - Card, CardHeader, CardContent, CardFooter
  - Modal with overlay
  - Badge (success, warning, error, info variants)
  - Spinner

- **Authentication**
  - Login page with email/password
  - Auth callback handler
  - Session management with Supabase SSR
  - Protected routes via middleware
  - Role-based helpers (isAdminOrManager)

- **Dashboard**
  - Dashboard layout with sidebar navigation
  - Role-based navigation (admin/manager see more)
  - Dashboard home with placeholder stats

- **Utility Functions**
  - formatCurrency() - USD formatting
  - formatDate() - Date formatting with date-fns
  - formatRelativeTime() - "2 hours ago" style
  - calcCommission() - Commission calculation logic
  - cn() - Class name merging

- **Database**
  - Supabase schema for all tables
  - TypeScript types generated
  - RLS policies for role-based access
  - Seed data for programs

### Technical
- Supabase client setup (server + client)
- Stripe client initialization
- Middleware for route protection
- Type exports from types/index.ts

---

## [0.0.1] - 2025-01-06

### Added
- Initial Next.js 16 project setup
- Project documentation structure
  - `CLAUDE.md` - Project overview and guidelines
  - `docs/architecture.md` - System design and data flow
  - `docs/changelog.md` - Version history (this file)
  - `docs/project_status.md` - Progress tracking
  - `docs/project_spec.md` - Full technical specification
- Core dependencies installed:
  - Supabase SSR + client
  - Stripe SDK
  - Resend email
  - Zod validation
  - date-fns
  - Tailwind CSS v4

### Technical
- Configured Tailwind CSS v4 with PostCSS
- Set up TypeScript with strict mode
- Configured ESLint for Next.js
- Environment variables structure defined

---

## Version History Format

### Types of changes
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes
- **Technical** - Internal changes, refactoring, dependencies

---

*This changelog is automatically updated by the `/update-docs-and-commit` command.*
