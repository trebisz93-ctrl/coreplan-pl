export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          campaign_type: string
          channel: string
          client_id: string
          created_at: string
          deleted_at: string | null
          end_date: string
          id: string
          name: string
          note: string | null
          organization_id: string | null
          package_id: string | null
          plan_id: string | null
          price: number
          product_ids: string[]
          start_date: string
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_type?: string
          channel?: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          end_date?: string
          id?: string
          name: string
          note?: string | null
          organization_id?: string | null
          package_id?: string | null
          plan_id?: string | null
          price?: number
          product_ids?: string[]
          start_date?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_type?: string
          channel?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          end_date?: string
          id?: string
          name?: string
          note?: string | null
          organization_id?: string | null
          package_id?: string | null
          plan_id?: string | null
          price?: number
          product_ids?: string[]
          start_date?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_estimation_periods: {
        Row: {
          created_at: string
          estimation_id: string
          id: string
          organization_id: string
          period: string
          period_end: string
          period_start: string
          unit_price_effective_from: string | null
          unit_price_snapshot: number | null
          units: number | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          estimation_id: string
          id?: string
          organization_id: string
          period: string
          period_end: string
          period_start: string
          unit_price_effective_from?: string | null
          unit_price_snapshot?: number | null
          units?: number | null
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          estimation_id?: string
          id?: string
          organization_id?: string
          period?: string
          period_end?: string
          period_start?: string
          unit_price_effective_from?: string | null
          unit_price_snapshot?: number | null
          units?: number | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_estimation_periods_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "activity_product_estimations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_estimation_periods_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "view_activity_estimations_report"
            referencedColumns: ["estimation_id"]
          },
          {
            foreignKeyName: "activity_estimation_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_product_estimations: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          organization_id: string
          product_id: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          organization_id: string
          product_id: string
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          product_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_product_estimations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_product_estimations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_product_estimations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          key: string
          organization_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          checksum: string
          created_at: string
          error_message: string | null
          file_path: string
          id: string
          organization_id: string | null
          size_bytes: number
          status: string
          type: string
          user_id: string
        }
        Insert: {
          checksum: string
          created_at?: string
          error_message?: string | null
          file_path: string
          id?: string
          organization_id?: string | null
          size_bytes?: number
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          checksum?: string
          created_at?: string
          error_message?: string | null
          file_path?: string
          id?: string
          organization_id?: string | null
          size_bytes?: number
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_types: {
        Row: {
          created_at: string
          id: string
          label: string
          name: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          name: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          name?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          annual_budget: number
          created_at: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          purge_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_budget?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          purge_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_budget?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          purge_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      confirmations: {
        Row: {
          activity_id: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string
          is_cover: boolean
          link: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url: string
          is_cover?: boolean
          link?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string
          is_cover?: boolean
          link?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          is_read: boolean
          name: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          name: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      import_history: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          error_count: number
          errors: Json | null
          file_name: string
          id: string
          imported_rows: number
          organization_id: string | null
          status: string
          total_rows: number
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          error_count?: number
          errors?: Json | null
          file_name: string
          id?: string
          imported_rows?: number
          organization_id?: string | null
          status?: string
          total_rows?: number
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          error_count?: number
          errors?: Json | null
          file_name?: string
          id?: string
          imported_rows?: number
          organization_id?: string | null
          status?: string
          total_rows?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plans: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string
          version: string | null
          year: number
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
          version?: string | null
          year?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
          version?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          cta_path: string | null
          description: string | null
          entity_id: string | null
          id: string
          is_read: boolean
          organization_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          cta_path?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean
          organization_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          cta_path?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean
          organization_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_role: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_role?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_role?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          internal_note: string | null
          name: string
          nip: string | null
          onboarding_completed: boolean
          phone: string | null
          purge_at: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          internal_note?: string | null
          name: string
          nip?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          purge_at?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          internal_note?: string | null
          name?: string
          nip?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          purge_at?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          default_price: number
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          items: Json
          name: string
          organization_id: string | null
          purge_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_price?: number
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          name: string
          organization_id?: string | null
          purge_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_price?: number
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          name?: string
          organization_id?: string | null
          purge_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_clients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          organization_id: string
          price: number
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          id?: string
          organization_id: string
          price: number
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          organization_id?: string
          price?: number
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          ean: string | null
          id: string
          name: string
          organization_id: string | null
          purge_at: string | null
          subcategory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          ean?: string | null
          id?: string
          name: string
          organization_id?: string | null
          purge_at?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          ean?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          purge_at?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          display_name: string | null
          first_name: string | null
          id: string
          job_role: string | null
          last_name: string | null
          onboarding_completed: boolean
          organization_id: string | null
          purge_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          job_role?: string | null
          last_name?: string | null
          onboarding_completed?: boolean
          organization_id?: string | null
          purge_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          job_role?: string | null
          last_name?: string | null
          onboarding_completed?: boolean
          organization_id?: string | null
          purge_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trash_registry: {
        Row: {
          deleted_at: string
          deleted_by: string
          id: string
          organization_id: string | null
          purge_at: string
          record_id: string
          record_name: string
          record_type: string
          restored_at: string | null
        }
        Insert: {
          deleted_at?: string
          deleted_by: string
          id?: string
          organization_id?: string | null
          purge_at?: string
          record_id: string
          record_name: string
          record_type: string
          restored_at?: string | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string
          id?: string
          organization_id?: string | null
          purge_at?: string
          record_id?: string
          record_name?: string
          record_type?: string
          restored_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      view_activity_estimations_report: {
        Row: {
          activity_id: string | null
          activity_name: string | null
          after_end: string | null
          after_start: string | null
          after_units: number | null
          after_value: number | null
          before_end: string | null
          before_start: string | null
          before_units: number | null
          before_value: number | null
          client_id: string | null
          created_at: string | null
          during_end: string | null
          during_start: string | null
          during_units: number | null
          during_value: number | null
          estimation_id: string | null
          growth_after_pct: number | null
          growth_during_pct: number | null
          organization_id: string | null
          product_id: string | null
          product_name: string | null
          unit: string | null
          unit_price_effective_from: string | null
          unit_price_snapshot: number | null
          user_display_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_product_estimations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_product_estimations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_product_estimations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_old_backups: { Args: never; Returns: undefined }
      create_client_for_org: {
        Args: { _name: string; _organization_id: string }
        Returns: {
          annual_budget: number
          created_at: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          purge_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      grant_prgm_role: { Args: { _target_user_id: string }; Returns: undefined }
      has_any_org_membership: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purge_expired_trash: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      revoke_prgm_role: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "manager"
        | "viewer"
        | "super_admin"
        | "org_admin"
        | "prgm"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "manager",
        "viewer",
        "super_admin",
        "org_admin",
        "prgm",
      ],
    },
  },
} as const
