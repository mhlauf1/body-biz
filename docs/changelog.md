# Changelog

All notable changes to the Body Biz Client Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Email confirmations (Resend)
- Team management page
- Program management page
- Dashboard home with real stats
- Failed payment handling UI
- Subscription pause/resume/cancel

---

## [0.5.0] - 2026-01-07

### Added
- **Payment Link Form UX Overhaul (Milestone 5)**
  - New/Existing client toggle - create clients inline or select from list
  - Searchable client dropdown with typeahead filtering
  - Inline success state showing generated link with copy button
  - "Create Another" flow for creating multiple links

- **SearchableSelect Component**
  - New reusable UI component for autocomplete dropdowns
  - Keyboard navigation (arrow keys, Enter, Escape)
  - Real-time filtering as you type
  - Clear button to reset selection
  - Fully accessible with ARIA attributes

- **Pending Links Visibility**
  - `PendingLinksList` component on payments page
  - Pending link display on client profile quick actions
  - Copy link and open in new tab actions
  - Expiration time display

- **Public Payment Pages**
  - New `/(public)` route group for client-facing pages
  - Payment success page at `/payments/success`
  - Payment cancelled page at `/payments/cancelled`
  - No authentication required (appropriate for post-checkout)

- **Login Improvements**
  - Profile verification after successful auth
  - Checks user exists in `public.users` table
  - User-friendly error messages
  - Auto sign-out for users without profiles

- **Testing Infrastructure**
  - `TESTING_OUTLINE.md` - Comprehensive testing guide with 68+ test cases
  - `scripts/set-user-passwords.js` - Helper script for test user setup

### Changed
- Checkout API (`/api/payments/checkout`) now supports inline client creation
- Payment link form completely redesigned for better UX
- Payments page refactored to use new `PendingLinksList` component
- Client quick actions now show pending payment links

### Removed
- Old success/cancelled pages from dashboard route (moved to public)

### Technical
- Added `SearchableSelect` to UI component exports
- Improved form validation with better error messages
- Client duplicate email detection during inline creation

---

## [0.4.0] - 2026-01-07

### Added
- **Reports & Commission Tracking (Milestone 4)**
  - Reports page for admin/manager users
  - Commission breakdown by trainer table
  - Summary cards (Total Revenue, Trainer Payouts, Owner Cut)
  - Semi-monthly pay period support (1st-15th, 16th-end of month)
  - Date range presets (Current/Previous Pay Period, This Month, etc.)
  - Custom date range picker
  - CSV export with totals row

- **API Routes**
  - `GET /api/reports/commissions` - Get commission data by date range

- **Utilities**
  - `lib/dateRanges.ts` - Pay period calculation and date range helpers

### Technical
- Role-based access control (admin/manager only)
- Aggregation by trainer with client count
- Responsive table design for mobile

---

## [0.3.0] - 2026-01-07

### Added
- **Recharge Existing Clients (Milestone 3)**
  - One-click charge for clients with saved payment methods
  - New Charge modal with program selection and commission preview
  - Payment method selector showing saved cards from Stripe
  - Support for ongoing vs fixed-term subscriptions
  - Commission split preview before charging

- **API Routes**
  - `GET /api/clients/[id]/payment-methods` - Fetch saved cards from Stripe
  - `POST /api/payments/charge` - Charge saved payment method

- **UI Components**
  - `NewChargeModal` - Modal for one-click recharges with commission preview
  - `ClientQuickActions` - Quick action buttons on client profile

### Technical
- Automatic Stripe subscription creation with duration support
- Commission calculation stored at charge time
- Error handling for declined cards and payment failures
- Defensive rollback if purchase record creation fails after Stripe charge

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
