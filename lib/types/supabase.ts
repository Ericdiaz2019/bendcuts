export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          related_cad_file_id: string | null
          related_order_id: string | null
          related_project_id: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          related_cad_file_id?: string | null
          related_order_id?: string | null
          related_project_id?: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          related_cad_file_id?: string | null
          related_order_id?: string | null
          related_project_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_related_cad_file_id_fkey"
            columns: ["related_cad_file_id"]
            isOneToOne: false
            referencedRelation: "cad_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      addresses: {
        Row: {
          city: string
          company: string | null
          country: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          phone: string | null
          state: string
          street1: string
          street2: string | null
          type: Database["public"]["Enums"]["address_type"]
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          company?: string | null
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          phone?: string | null
          state: string
          street1: string
          street2?: string | null
          type: Database["public"]["Enums"]["address_type"]
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          company?: string | null
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          phone?: string | null
          state?: string
          street1?: string
          street2?: string | null
          type?: Database["public"]["Enums"]["address_type"]
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cad_files: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_hash: string | null
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["cad_file_type"]
          id: string
          is_primary: boolean
          parsed_analysis: Json | null
          project_id: string | null
          storage_bucket: string
          storage_path: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_hash?: string | null
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["cad_file_type"]
          id?: string
          is_primary?: boolean
          parsed_analysis?: Json | null
          project_id?: string | null
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_hash?: string | null
          file_name?: string
          file_size?: number
          file_type?: Database["public"]["Enums"]["cad_file_type"]
          id?: string
          is_primary?: boolean
          parsed_analysis?: Json | null
          project_id?: string | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cad_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cad_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configurations: {
        Row: {
          bend_requirements: Json
          cad_file_id: string
          created_at: string
          finishing: Database["public"]["Enums"]["finishing_type"]
          finishing_notes: string | null
          gauge: string
          id: string
          is_current: boolean
          lead_time_days: number | null
          material_id: string | null
          material_name: string
          material_snapshot: Json | null
          project_id: string | null
          quantity: number
          quote: Json
          rush_order: boolean
          saved_at: string
          subtotal: number
          tax: number
          tolerances: Json | null
          total: number
          tube_specification: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bend_requirements?: Json
          cad_file_id: string
          created_at?: string
          finishing?: Database["public"]["Enums"]["finishing_type"]
          finishing_notes?: string | null
          gauge: string
          id?: string
          is_current?: boolean
          lead_time_days?: number | null
          material_id?: string | null
          material_name: string
          material_snapshot?: Json | null
          project_id?: string | null
          quantity: number
          quote: Json
          rush_order?: boolean
          saved_at?: string
          subtotal?: number
          tax?: number
          tolerances?: Json | null
          total?: number
          tube_specification?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bend_requirements?: Json
          cad_file_id?: string
          created_at?: string
          finishing?: Database["public"]["Enums"]["finishing_type"]
          finishing_notes?: string | null
          gauge?: string
          id?: string
          is_current?: boolean
          lead_time_days?: number | null
          material_id?: string | null
          material_name?: string
          material_snapshot?: Json | null
          project_id?: string | null
          quantity?: number
          quote?: Json
          rush_order?: boolean
          saved_at?: string
          subtotal?: number
          tax?: number
          tolerances?: Json | null
          total?: number
          tube_specification?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configurations_cad_file_id_fkey"
            columns: ["cad_file_id"]
            isOneToOne: false
            referencedRelation: "cad_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configurations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configurations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_files: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["order_doc_type"]
          file_name: string
          file_size: number | null
          id: string
          order_id: string
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["order_doc_type"]
          file_name: string
          file_size?: number | null
          id?: string
          order_id: string
          storage_bucket?: string
          storage_path: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["order_doc_type"]
          file_name?: string
          file_size?: number | null
          id?: string
          order_id?: string
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          bends: number | null
          cad_file_id: string
          configuration_id: string
          created_at: string
          cuts: number | null
          file_name: string
          gauge: string
          id: string
          length_inches: number | null
          length_mm: number | null
          line_total: number
          material_id: string | null
          material_name: string
          order_id: string
          price_per_part: number
          quantity: number
          quote_snapshot: Json | null
        }
        Insert: {
          bends?: number | null
          cad_file_id: string
          configuration_id: string
          created_at?: string
          cuts?: number | null
          file_name: string
          gauge: string
          id?: string
          length_inches?: number | null
          length_mm?: number | null
          line_total: number
          material_id?: string | null
          material_name: string
          order_id: string
          price_per_part: number
          quantity: number
          quote_snapshot?: Json | null
        }
        Update: {
          bends?: number | null
          cad_file_id?: string
          configuration_id?: string
          created_at?: string
          cuts?: number | null
          file_name?: string
          gauge?: string
          id?: string
          length_inches?: number | null
          length_mm?: number | null
          line_total?: number
          material_id?: string | null
          material_name?: string
          order_id?: string
          price_per_part?: number
          quantity?: number
          quote_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_cad_file_id_fkey"
            columns: ["cad_file_id"]
            isOneToOne: false
            referencedRelation: "cad_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          action: Database["public"]["Enums"]["order_action"]
          actual_delivery: string | null
          billing_address_id: string | null
          carrier: string | null
          created_at: string
          currency: string
          estimated_delivery: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          payment_method_id: string | null
          project_id: string | null
          shipping: number
          shipping_address_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          subtotal: number
          tax: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["order_action"]
          actual_delivery?: string | null
          billing_address_id?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string
          estimated_delivery?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          payment_method_id?: string | null
          project_id?: string | null
          shipping?: number
          shipping_address_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["order_action"]
          actual_delivery?: string | null
          billing_address_id?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string
          estimated_delivery?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          payment_method_id?: string | null
          project_id?: string | null
          shipping?: number
          shipping_address_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_default: boolean
          is_valid: boolean
          last4: string | null
          stripe_payment_method_id: string | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean
          is_valid?: boolean
          last4?: string | null
          stripe_payment_method_id?: string | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean
          is_valid?: boolean
          last4?: string | null
          stripe_payment_method_id?: string | null
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          id: string
          bending_cost_per_bend: number
          cutting_cost_per_cut: number
          setup_cost: number
          labor_rate: number
          base_time_per_part: number
          time_per_bend: number
          time_per_cut: number
          tax_rate: number
          material_weights: Json
          quantity_discounts: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id: string
          bending_cost_per_bend?: number
          cutting_cost_per_cut?: number
          setup_cost?: number
          labor_rate?: number
          base_time_per_part?: number
          time_per_bend?: number
          time_per_cut?: number
          tax_rate?: number
          material_weights?: Json
          quantity_discounts?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          bending_cost_per_bend?: number
          cutting_cost_per_cut?: number
          setup_cost?: number
          labor_rate?: number
          base_time_per_part?: number
          time_per_bend?: number
          time_per_cut?: number
          tax_rate?: number
          material_weights?: Json
          quantity_discounts?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_message: string | null
          id: string
          metadata: Json
          order_id: string
          payment_method_id: string | null
          refunded_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          metadata?: Json
          order_id: string
          payment_method_id?: string | null
          refunded_amount?: number
          status: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          payment_method_id?: string | null
          refunded_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          phone: string | null
          preferences: Json
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_template: boolean
          name: string
          shared_with: string[]
          status: Database["public"]["Enums"]["project_status"]
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          name: string
          shared_with?: string[]
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          name?: string
          shared_with?: string[]
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_stats: {
        Row: {
          average_order_value: number | null
          last_order_at: string | null
          orders_in_production: number | null
          projects_in_progress: number | null
          total_orders: number | null
          total_projects: number | null
          total_spent: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_order_graph: {
        Args: {
          p_action: string
          p_bends: number
          p_currency: string
          p_cuts: number
          p_file_name: string
          p_file_size: number
          p_file_type: string
          p_gauge: string
          p_idempotency_key: string | null
          p_length_inches: number
          p_length_mm: number
          p_material_id: string | null
          p_material_name: string
          p_parsed_analysis: Json
          p_payment_charge_id?: string | null
          p_payment_intent_id?: string | null
          p_payment_metadata?: Json | null
          p_payment_method_id: string | null
          p_payment_status?: string | null
          p_price_per_part: number
          p_quantity: number
          p_quote: Json
          p_shipping: number
          p_status: string
          p_storage_bucket: string
          p_storage_path: string
          p_subtotal: number
          p_tax: number
          p_total: number
        }
        Returns: {
          cad_file_id: string
          configuration_id: string
          idempotent_replay: boolean
          order_id: string
          order_number: string
        }[]
      }
      generate_order_number: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      activity_type:
        | "project_created"
        | "project_updated"
        | "order_placed"
        | "order_saved"
        | "order_shipped"
        | "quote_generated"
        | "payment_succeeded"
        | "payment_failed"
        | "file_uploaded"
        | "file_deleted"
      address_type: "billing" | "shipping"
      cad_file_type: "step" | "stp" | "iges" | "igs" | "dxf"
      finishing_type: "none" | "deburr" | "polish" | "paint" | "powder_coat"
      order_action: "submit" | "save"
      order_doc_type:
        | "drawing"
        | "specification"
        | "invoice"
        | "packing_slip"
        | "certificate"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "in_production"
        | "quality_check"
        | "ready_to_ship"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_method_type: "card" | "bank" | "paypal"
      payment_status:
        | "requires_payment_method"
        | "requires_confirmation"
        | "requires_action"
        | "processing"
        | "requires_capture"
        | "succeeded"
        | "canceled"
        | "refunded"
        | "failed"
      project_status:
        | "draft"
        | "ready"
        | "quoted"
        | "ordered"
        | "in_production"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "archived"
      user_role: "user" | "admin" | "business"
    }
    CompositeTypes: Record<string, never>
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
