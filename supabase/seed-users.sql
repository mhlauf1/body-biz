-- Body Biz Seed Data - Users
-- Run this AFTER schema.sql and rls-policies.sql
-- These UUIDs must match the auth.users table

-- ============================================
-- SEED USERS (Staff & Trainers)
-- ============================================

-- Admin - Kate (100% commission on own clients, 30% cut from others)
INSERT INTO users (id, email, name, role, commission_rate, is_active)
VALUES (
  '6c4c695e-a281-43df-873b-ff76ca1ab697',
  'mhlauf1@gmail.com',
  'Kate',
  'admin',
  1.0,
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  commission_rate = EXCLUDED.commission_rate;

-- Manager - Lexie (same access as admin, 70% commission)
INSERT INTO users (id, email, name, role, commission_rate, is_active)
VALUES (
  'ed39d4f3-e13d-4170-9473-e3f6af68b5cb',
  'mhlauf1+manager@gmail.com',
  'Lexie',
  'manager',
  0.70,
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  commission_rate = EXCLUDED.commission_rate;

-- Trainer - Mattie (own clients only, 70% commission)
INSERT INTO users (id, email, name, role, commission_rate, is_active)
VALUES (
  '14c7e33d-ccf4-49f5-a9f5-73bad09fc799',
  'mhlauf1+trainer@gmail.com',
  'Mattie',
  'trainer',
  0.70,
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  commission_rate = EXCLUDED.commission_rate;

-- Verify the insert
SELECT id, email, name, role, commission_rate FROM users;
