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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          assigned_role: string
          explanation: string
          id: string
          item_id: number | null
          location_id: string
          location_type: string
          resolution_date: string | null
          severity: string
          status: string
          timestamp: string
          verification_notes: string | null
        }
        Insert: {
          alert_type: string
          assigned_role: string
          explanation: string
          id: string
          item_id?: number | null
          location_id: string
          location_type: string
          resolution_date?: string | null
          severity: string
          status?: string
          timestamp?: string
          verification_notes?: string | null
        }
        Update: {
          alert_type?: string
          assigned_role?: string
          explanation?: string
          id?: string
          item_id?: number | null
          location_id?: string
          location_type?: string
          resolution_date?: string | null
          severity?: string
          status?: string
          timestamp?: string
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          details: string
          entity_id: string
          entity_type: string
          id: number
          timestamp: string
          user_id: string | null
          username: string
        }
        Insert: {
          action: string
          details: string
          entity_id: string
          entity_type: string
          id?: number
          timestamp?: string
          user_id?: string | null
          username: string
        }
        Update: {
          action?: string
          details?: string
          entity_id?: string
          entity_type?: string
          id?: number
          timestamp?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      commodities: {
        Row: {
          buffer_pct: number
          code: string
          id: number
          monthly_entitlement_per_card: number
          name: string
          unit: string
        }
        Insert: {
          buffer_pct?: number
          code: string
          id: number
          monthly_entitlement_per_card?: number
          name: string
          unit?: string
        }
        Update: {
          buffer_pct?: number
          code?: string
          id?: number
          monthly_entitlement_per_card?: number
          name?: string
          unit?: string
        }
        Relationships: []
      }
      data_source_settings: {
        Row: {
          config: Json | null
          id: number
          is_active: boolean
          source_name: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          id?: number
          is_active?: boolean
          source_name: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          id?: number
          is_active?: boolean
          source_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          dispatch_movement_id: string
          dispatched_date: string
          dispatched_qty_kg: number
          expected_delivery_date: string
          from_godown_id: string
          id: string
          notes: string | null
          received_date: string | null
          received_qty_kg: number
          status: string
          to_shop_id: string
        }
        Insert: {
          dispatch_movement_id: string
          dispatched_date: string
          dispatched_qty_kg: number
          expected_delivery_date: string
          from_godown_id: string
          id: string
          notes?: string | null
          received_date?: string | null
          received_qty_kg?: number
          status?: string
          to_shop_id: string
        }
        Update: {
          dispatch_movement_id?: string
          dispatched_date?: string
          dispatched_qty_kg?: number
          expected_delivery_date?: string
          from_godown_id?: string
          id?: string
          notes?: string | null
          received_date?: string | null
          received_qty_kg?: number
          status?: string
          to_shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_from_godown_id_fkey"
            columns: ["from_godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_from_godown_id_fkey"
            columns: ["from_godown_id"]
            isOneToOne: false
            referencedRelation: "v_godown_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_to_shop_id_fkey"
            columns: ["to_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_to_shop_id_fkey"
            columns: ["to_shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_accounts: {
        Row: {
          district_id: number | null
          email: string
          full_name: string
          godown_id: string | null
          legacy_user_id: number
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string | null
          username: string
        }
        Insert: {
          district_id?: number | null
          email: string
          full_name: string
          godown_id?: string | null
          legacy_user_id: number
          role: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          username: string
        }
        Update: {
          district_id?: number | null
          email?: string
          full_name?: string
          godown_id?: string | null
          legacy_user_id?: number
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_accounts_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_accounts_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_accounts_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "v_godown_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          code: string
          headquarters: string
          id: number
          lat: number | null
          lng: number | null
          name: string
          zone: string | null
        }
        Insert: {
          code: string
          headquarters: string
          id: number
          lat?: number | null
          lng?: number | null
          name: string
          zone?: string | null
        }
        Update: {
          code?: string
          headquarters?: string
          id?: number
          lat?: number | null
          lng?: number | null
          name?: string
          zone?: string | null
        }
        Relationships: []
      }
      godowns: {
        Row: {
          capacity_kg: number
          code: string
          district_id: number
          id: string
          lat: number | null
          lng: number | null
          name: string
          opening_stock_kg: number
        }
        Insert: {
          capacity_kg: number
          code: string
          district_id: number
          id: string
          lat?: number | null
          lng?: number | null
          name: string
          opening_stock_kg?: number
        }
        Update: {
          capacity_kg?: number
          code?: string
          district_id?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          opening_stock_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "godowns_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          id: string
          inspector_name: string
          location_id: string
          location_type: string
          measured_date: string
          measured_stock_kg: number
          remarks: string | null
        }
        Insert: {
          id: string
          inspector_name: string
          location_id: string
          location_type: string
          measured_date: string
          measured_stock_kg: number
          remarks?: string | null
        }
        Update: {
          id?: string
          inspector_name?: string
          location_id?: string
          location_type?: string
          measured_date?: string
          measured_stock_kg?: number
          remarks?: string | null
        }
        Relationships: []
      }
      monthly_distribution: {
        Row: {
          beneficiary_households_served: number
          created_at: string
          distributed_qty_kg: number
          id: number
          month_year: string
          shop_id: string
        }
        Insert: {
          beneficiary_households_served?: number
          created_at?: string
          distributed_qty_kg: number
          id?: number
          month_year: string
          shop_id: string
        }
        Update: {
          beneficiary_households_served?: number
          created_at?: string
          distributed_qty_kg?: number
          id?: number
          month_year?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_distribution_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_distribution_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          confidence: number
          created_at: string
          created_by: string | null
          days_left: number | null
          id: number
          inputs: Json | null
          item_id: number | null
          lookback_months: number
          method: string
          planned_incoming_kg: number
          predicted_demand_kg: number
          predicted_stockout_date: string | null
          recommended_replenishment_kg: number
          run_date: string
          safety_buffer_kg: number
          shop_id: string
          usable_stock_kg: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          days_left?: number | null
          id?: number
          inputs?: Json | null
          item_id?: number | null
          lookback_months?: number
          method?: string
          planned_incoming_kg: number
          predicted_demand_kg: number
          predicted_stockout_date?: string | null
          recommended_replenishment_kg: number
          run_date?: string
          safety_buffer_kg: number
          shop_id: string
          usable_stock_kg: number
        }
        Update: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          days_left?: number | null
          id?: number
          inputs?: Json | null
          item_id?: number | null
          lookback_months?: number
          method?: string
          planned_incoming_kg?: number
          predicted_demand_kg?: number
          predicted_stockout_date?: string | null
          recommended_replenishment_kg?: number
          run_date?: string
          safety_buffer_kg?: number
          shop_id?: string
          usable_stock_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "predictions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          legacy_user_id: number | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          legacy_user_id?: number | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          legacy_user_id?: number | null
          username?: string | null
        }
        Relationships: []
      }
      shops: {
        Row: {
          beneficiaries_count: number
          card_count: number
          code: string
          district_id: number
          godown_id: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          opening_stock_kg: number
        }
        Insert: {
          beneficiaries_count?: number
          card_count?: number
          code: string
          district_id: number
          godown_id: string
          id: string
          lat?: number | null
          lng?: number | null
          name: string
          opening_stock_kg?: number
        }
        Update: {
          beneficiaries_count?: number
          card_count?: number
          code?: string
          district_id?: number
          godown_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          opening_stock_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "shops_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "v_godown_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          id: number
          item_id: number
          location_id: string
          location_type: string
          qty_kg: number
          source: string
          updated_at: string
        }
        Insert: {
          id?: number
          item_id?: number
          location_id: string
          location_type: string
          qty_kg?: number
          source?: string
          updated_at?: string
        }
        Update: {
          id?: number
          item_id?: number
          location_id?: string
          location_type?: string
          qty_kg?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_by: string
          id: string
          location_id: string
          location_type: string
          movement_type: string
          quantity_kg: number
          reference_id: string | null
          timestamp: string
        }
        Insert: {
          created_by: string
          id: string
          location_id: string
          location_type: string
          movement_type: string
          quantity_kg: number
          reference_id?: string | null
          timestamp?: string
        }
        Update: {
          created_by?: string
          id?: string
          location_id?: string
          location_type?: string
          movement_type?: string
          quantity_kg?: number
          reference_id?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          bags: number
          card_no: string
          id: string
          item_id: number
          qty_kg: number
          shop_id: string
          source: string
          timestamp: string
        }
        Insert: {
          bags?: number
          card_no: string
          id: string
          item_id?: number
          qty_kg: number
          shop_id: string
          source?: string
          timestamp?: string
        }
        Update: {
          bags?: number
          card_no?: string
          id?: string
          item_id?: number
          qty_kg?: number
          shop_id?: string
          source?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          district_id: number | null
          godown_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string | null
          user_id: string
        }
        Insert: {
          district_id?: number | null
          godown_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id: string
        }
        Update: {
          district_id?: number | null
          godown_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "v_godown_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_stock"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_godown_stock: {
        Row: {
          adjustments_kg: number | null
          capacity_kg: number | null
          code: string | null
          dispatches_kg: number | null
          district_id: number | null
          expected_stock_kg: number | null
          id: string | null
          lat: number | null
          lng: number | null
          name: string | null
          opening_stock_kg: number | null
          receipts_kg: number | null
          utilization_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "godowns_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_measurement_reconciliation: {
        Row: {
          difference_kg: number | null
          difference_pct: number | null
          discrepancy_detected: boolean | null
          district_id: number | null
          expected_stock_kg: number | null
          inspector_name: string | null
          location_id: string | null
          location_label: string | null
          location_type: string | null
          measured_date: string | null
          measured_stock_kg: number | null
          measurement_id: string | null
          remarks: string | null
          status_label: string | null
          tolerance_pct: number | null
        }
        Relationships: []
      }
      v_shop_stock: {
        Row: {
          adjustments_kg: number | null
          avg_monthly_dist_kg: number | null
          beneficiaries_count: number | null
          card_count: number | null
          code: string | null
          confirmed_deliveries_kg: number | null
          critical_threshold_kg: number | null
          distributions_kg: number | null
          district_id: number | null
          expected_stock_kg: number | null
          godown_id: string | null
          id: string | null
          lat: number | null
          lng: number | null
          low_stock_threshold_kg: number | null
          name: string | null
          opening_stock_kg: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "v_godown_stock"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _actor_username: { Args: never; Returns: string }
      _check_location_access: {
        Args: {
          _action: string
          _loc_id: string
          _loc_type: string
          _r: Database["public"]["Tables"]["user_roles"]["Row"]
        }
        Returns: undefined
      }
      _has_open_alert: {
        Args: { _loc: string; _type: string }
        Returns: boolean
      }
      _ingest_allowed: { Args: never; Returns: undefined }
      _log_audit: {
        Args: {
          _action: string
          _details: string
          _entity_id: string
          _entity_type: string
          _username?: string
        }
        Returns: undefined
      }
      _next_id: { Args: { _prefix: string }; Returns: string }
      _require_roles: {
        Args: { _allowed: Database["public"]["Enums"]["app_role"][] }
        Returns: {
          district_id: number | null
          godown_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_roles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _scan_alerts: { Args: never; Returns: Json }
      activate_data_source: { Args: { _source_name: string }; Returns: Json }
      attach_demo_identity: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      confirm_delivery: {
        Args: {
          _delivery_id: string
          _notes?: string
          _received_qty_kg: number
        }
        Returns: Json
      }
      create_dispatch: {
        Args: {
          _expected_delivery_date?: string
          _godown_id: string
          _notes?: string
          _quantity_kg: number
          _shop_id: string
        }
        Returns: Json
      }
      godown_stock: {
        Args: { _as_of?: string; _godown_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_stock: {
        Args: {
          _item_id?: number
          _location_id: string
          _location_type: string
          _qty_kg: number
          _source?: string
          _ts?: string
        }
        Returns: Json
      }
      ingest_transaction: {
        Args: {
          _bags?: number
          _card_no: string
          _item_id?: number
          _qty_kg: number
          _shop_id: string
          _source?: string
          _ts?: string
        }
        Returns: Json
      }
      monthly_report_rows: {
        Args: { _month: string }
        Returns: {
          beneficiaries_count: number
          closing_stock_kg: number
          distributed_kg: number
          district_code: string
          district_id: number
          district_name: string
          godown_id: string
          mom_diff_kg: number
          mom_pct: number
          opening_stock_kg: number
          prev_distributed_kg: number
          received_kg: number
          shop_id: string
          shop_name: string
          status: string
        }[]
      }
      record_adjustment: {
        Args: {
          _location_id: string
          _location_type: string
          _quantity_kg: number
          _reason: string
        }
        Returns: Json
      }
      record_distribution: {
        Args: {
          _beneficiary_households?: number
          _quantity_kg: number
          _reference_id?: string
          _shop_id: string
        }
        Returns: Json
      }
      record_measurement: {
        Args: {
          _location_id: string
          _location_type: string
          _measured_stock_kg: number
          _remarks?: string
        }
        Returns: Json
      }
      record_receipt: {
        Args: {
          _godown_id: string
          _quantity_kg: number
          _reference_id?: string
        }
        Returns: Json
      }
      run_forecast: {
        Args: { _buffer_pct?: number; _lookback?: number; _shop_id: string }
        Returns: Json
      }
      scan_alerts: { Args: never; Returns: Json }
      shop_avg_monthly: { Args: { _shop_id: string }; Returns: number }
      shop_stock: {
        Args: { _as_of?: string; _shop_id: string }
        Returns: number
      }
      stock_status: { Args: { _avg: number; _stock: number }; Returns: string }
      update_alert_status: {
        Args: { _alert_id: string; _new_status: string; _notes: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "state_admin"
        | "district_officer"
        | "godown_manager"
        | "shop_manager"
        | "stock_inspector"
        | "data_entry_officer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "state_admin",
        "district_officer",
        "godown_manager",
        "shop_manager",
        "stock_inspector",
        "data_entry_officer",
      ],
    },
  },
} as const
