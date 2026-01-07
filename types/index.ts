export type { Database, Tables, InsertTables, UpdateTables, Json } from './database'

// Re-export common table types for convenience
export type User = Tables<'users'>
export type Client = Tables<'clients'>
export type Program = Tables<'programs'>
export type Purchase = Tables<'purchases'>
export type PaymentLink = Tables<'payment_links'>
export type AuditLog = Tables<'audit_log'>

// Role type
export type UserRole = 'admin' | 'manager' | 'trainer'

// Purchase status type
export type PurchaseStatus =
  | 'pending'
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'failed'

// Payment link status type
export type PaymentLinkStatus = 'active' | 'used' | 'expired' | 'cancelled'

// Import helper type
import type { Database } from './database'
type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
