-- Body Biz Seed Data - Programs
-- Run this AFTER schema.sql and rls-policies.sql

-- ============================================
-- SEED PROGRAMS
-- ============================================
INSERT INTO programs (name, description, default_price, default_duration_months, is_recurring, is_addon, is_active)
VALUES
  ('3 Month Personal Coaching (Kate)', 'Personal training with Kate - premium rate', 700.00, 3, true, false, true),
  ('3 Month Personal Coaching', 'Personal training with Lexie or Mattie', 625.00, 3, true, false, true),
  ('Nutrition Only', 'Nutrition coaching only - monthly', 300.00, 1, true, false, true),
  ('VO2/RMR/Fit3D Testing', 'Initial testing package - one time', 210.00, NULL, false, true, true),
  ('6 Month Personal Coaching', 'Extended personal training program', 625.00, 6, true, false, true),
  ('Monthly Coaching', 'Month-to-month personal training (ongoing)', 650.00, NULL, true, false, true);

-- Verify the insert
SELECT name, default_price, default_duration_months, is_recurring, is_addon FROM programs;
