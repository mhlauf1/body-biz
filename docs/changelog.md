# Changelog

All notable changes to the Body Biz Client Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- User authentication (password login)
- Client management (list, profile, create)
- Payment link creation (Stripe Checkout)
- Recharge existing clients (saved cards)
- Commission tracking on purchases
- Admin reports (revenue, commission breakdown)
- Email confirmations (Resend)

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
