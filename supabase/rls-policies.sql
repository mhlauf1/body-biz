-- Body Biz RLS Policies
-- Run this AFTER schema.sql in Supabase SQL Editor

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check if admin or manager
-- ============================================
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get current user's role
-- ============================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS VARCHAR AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- USERS POLICIES
-- ============================================
-- Everyone can read all users (needed for trainer dropdowns)
CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT TO authenticated
  USING (true);

-- Only admins/managers can insert users
CREATE POLICY "Admin/Manager can insert users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

-- Only admins/managers can update users
CREATE POLICY "Admin/Manager can update users" ON users
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- Only admins/managers can delete users
CREATE POLICY "Admin/Manager can delete users" ON users
  FOR DELETE TO authenticated
  USING (is_admin_or_manager());

-- ============================================
-- CLIENTS POLICIES
-- ============================================
-- Admin/Manager can see all clients
CREATE POLICY "Admin/Manager can view all clients" ON clients
  FOR SELECT TO authenticated
  USING (is_admin_or_manager());

-- Trainers can see their own clients
CREATE POLICY "Trainers can view own clients" ON clients
  FOR SELECT TO authenticated
  USING (assigned_trainer_id = auth.uid());

-- Admin/Manager can create any client
CREATE POLICY "Admin/Manager can create clients" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

-- Trainers can create clients assigned to themselves
CREATE POLICY "Trainers can create own clients" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (assigned_trainer_id = auth.uid());

-- Admin/Manager can update any client
CREATE POLICY "Admin/Manager can update clients" ON clients
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- Trainers can update their own clients
CREATE POLICY "Trainers can update own clients" ON clients
  FOR UPDATE TO authenticated
  USING (assigned_trainer_id = auth.uid())
  WITH CHECK (assigned_trainer_id = auth.uid());

-- Admin/Manager can delete clients
CREATE POLICY "Admin/Manager can delete clients" ON clients
  FOR DELETE TO authenticated
  USING (is_admin_or_manager());

-- ============================================
-- PROGRAMS POLICIES
-- ============================================
-- Everyone can view active programs
CREATE POLICY "Everyone can view programs" ON programs
  FOR SELECT TO authenticated
  USING (true);

-- Only admin/manager can manage programs
CREATE POLICY "Admin/Manager can insert programs" ON programs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admin/Manager can update programs" ON programs
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admin/Manager can delete programs" ON programs
  FOR DELETE TO authenticated
  USING (is_admin_or_manager());

-- ============================================
-- PURCHASES POLICIES
-- ============================================
-- Admin/Manager can see all purchases
CREATE POLICY "Admin/Manager can view all purchases" ON purchases
  FOR SELECT TO authenticated
  USING (is_admin_or_manager());

-- Trainers can see their own purchases
CREATE POLICY "Trainers can view own purchases" ON purchases
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

-- Admin/Manager can create purchases
CREATE POLICY "Admin/Manager can create purchases" ON purchases
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

-- Trainers can create purchases for themselves
CREATE POLICY "Trainers can create own purchases" ON purchases
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Admin/Manager can update purchases
CREATE POLICY "Admin/Manager can update purchases" ON purchases
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- Trainers can update their own purchases
CREATE POLICY "Trainers can update own purchases" ON purchases
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Admin/Manager can delete purchases
CREATE POLICY "Admin/Manager can delete purchases" ON purchases
  FOR DELETE TO authenticated
  USING (is_admin_or_manager());

-- ============================================
-- PAYMENT_LINKS POLICIES
-- ============================================
-- Admin/Manager can see all payment links
CREATE POLICY "Admin/Manager can view all payment_links" ON payment_links
  FOR SELECT TO authenticated
  USING (is_admin_or_manager());

-- Trainers can see payment links they created
CREATE POLICY "Trainers can view own payment_links" ON payment_links
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- Admin/Manager can create payment links
CREATE POLICY "Admin/Manager can create payment_links" ON payment_links
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

-- Trainers can create payment links
CREATE POLICY "Trainers can create payment_links" ON payment_links
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Admin/Manager can update payment links
CREATE POLICY "Admin/Manager can update payment_links" ON payment_links
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- ============================================
-- AUDIT_LOG POLICIES
-- ============================================
-- Only admin/manager can view audit logs
CREATE POLICY "Admin/Manager can view audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (is_admin_or_manager());

-- Anyone can insert audit logs (for logging actions)
CREATE POLICY "Anyone can create audit_log" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);
