export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          stripe_customer_id: string | null
          assigned_trainer_id: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone?: string | null
          stripe_customer_id?: string | null
          assigned_trainer_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string | null
          stripe_customer_id?: string | null
          assigned_trainer_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_assigned_trainer_id_fkey'
            columns: ['assigned_trainer_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      payment_links: {
        Row: {
          id: string
          purchase_id: string | null
          url: string
          stripe_checkout_session_id: string | null
          status: string
          expires_at: string | null
          used_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          purchase_id?: string | null
          url: string
          stripe_checkout_session_id?: string | null
          status?: string
          expires_at?: string | null
          used_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          purchase_id?: string | null
          url?: string
          stripe_checkout_session_id?: string | null
          status?: string
          expires_at?: string | null
          used_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_payment_links_purchase'
            columns: ['purchase_id']
            isOneToOne: false
            referencedRelation: 'purchases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_links_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      programs: {
        Row: {
          id: string
          name: string
          description: string | null
          default_price: number | null
          default_duration_months: number | null
          is_recurring: boolean
          is_addon: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          default_price?: number | null
          default_duration_months?: number | null
          is_recurring?: boolean
          is_addon?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          default_price?: number | null
          default_duration_months?: number | null
          is_recurring?: boolean
          is_addon?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: string
          client_id: string
          trainer_id: string
          program_id: string | null
          amount: number
          duration_months: number | null
          is_recurring: boolean
          start_date: string | null
          end_date: string | null
          status: string
          stripe_subscription_id: string | null
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          payment_link_id: string | null
          custom_program_name: string | null
          notes: string | null
          trainer_commission_rate: number | null
          trainer_amount: number | null
          owner_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          trainer_id: string
          program_id?: string | null
          amount: number
          duration_months?: number | null
          is_recurring?: boolean
          start_date?: string | null
          end_date?: string | null
          status?: string
          stripe_subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          payment_link_id?: string | null
          custom_program_name?: string | null
          notes?: string | null
          trainer_commission_rate?: number | null
          trainer_amount?: number | null
          owner_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          trainer_id?: string
          program_id?: string | null
          amount?: number
          duration_months?: number | null
          is_recurring?: boolean
          start_date?: string | null
          end_date?: string | null
          status?: string
          stripe_subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          payment_link_id?: string | null
          custom_program_name?: string | null
          notes?: string | null
          trainer_commission_rate?: number | null
          trainer_amount?: number | null
          owner_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchases_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_payment_link_id_fkey'
            columns: ['payment_link_id']
            isOneToOne: false
            referencedRelation: 'payment_links'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          commission_rate: number
          phone: string | null
          is_active: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role: string
          commission_rate?: number
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          commission_rate?: number
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin_or_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
