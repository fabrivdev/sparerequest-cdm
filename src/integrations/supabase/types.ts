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
      admin_notifications: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          product_code: string | null
          type: string
          user_id: string
          user_name: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          product_code?: string | null
          type: string
          user_id: string
          user_name: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          product_code?: string | null
          type?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      branch_sales: {
        Row: {
          branch: string
          brand: string
          id: string
          product_code: string
          quantity_sold: number
          updated_at: string
          year_month: string
        }
        Insert: {
          branch: string
          brand: string
          id?: string
          product_code: string
          quantity_sold?: number
          updated_at?: string
          year_month: string
        }
        Update: {
          branch?: string
          brand?: string
          id?: string
          product_code?: string
          quantity_sold?: number
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      branch_stock: {
        Row: {
          branch: string
          brand: string
          id: string
          product_code: string
          product_name: string
          quantity: number
          updated_at: string
        }
        Insert: {
          branch: string
          brand: string
          id?: string
          product_code: string
          product_name: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          branch?: string
          brand?: string
          id?: string
          product_code?: string
          product_name?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_delegates: {
        Row: {
          created_at: string | null
          delegate_user_id: string
          id: string
          is_active: boolean | null
          owner_user_id: string
        }
        Insert: {
          created_at?: string | null
          delegate_user_id: string
          id?: string
          is_active?: boolean | null
          owner_user_id: string
        }
        Update: {
          created_at?: string | null
          delegate_user_id?: string
          id?: string
          is_active?: boolean | null
          owner_user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          branch_destination: string
          brand: string
          created_at: string
          delivered_at: string | null
          estimated_delivery_date: string | null
          id: string
          invoice_number: string | null
          invoice_observation: string | null
          invoiced_quantity: number | null
          is_invoiced: boolean | null
          not_invoiced_reason: string | null
          observation: string | null
          order_destination: string
          order_number: string | null
          product_code: string
          quantity: number
          requested_at: string | null
          shipping_method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_destination: string
          brand: string
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_observation?: string | null
          invoiced_quantity?: number | null
          is_invoiced?: boolean | null
          not_invoiced_reason?: string | null
          observation?: string | null
          order_destination?: string
          order_number?: string | null
          product_code: string
          quantity: number
          requested_at?: string | null
          shipping_method?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_destination?: string
          brand?: string
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_observation?: string | null
          invoiced_quantity?: number | null
          is_invoiced?: boolean | null
          not_invoiced_reason?: string | null
          observation?: string | null
          order_destination?: string
          order_number?: string | null
          product_code?: string
          quantity?: number
          requested_at?: string | null
          shipping_method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string
          code: string
          created_at: string
          id: string
          name: string
          price_aereo: number
          price_maritimo: number
          price_terrestre: number
          updated_at: string
        }
        Insert: {
          brand: string
          code: string
          created_at?: string
          id?: string
          name: string
          price_aereo: number
          price_maritimo?: number
          price_terrestre?: number
          updated_at?: string
        }
        Update: {
          brand?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          price_aereo?: number
          price_maritimo?: number
          price_terrestre?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch: string
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          text_color: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_upload_log: {
        Row: {
          created_at: string
          file_name: string
          id: string
          records_count: number
          upload_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          records_count?: number
          upload_type: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          records_count?: number
          upload_type?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          branch: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          sender_id: string
          sender_name: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          sender_id: string
          sender_name: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          sender_id?: string
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          transfer_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          transfer_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_alerts_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_status_log: {
        Row: {
          changed_by: string
          changed_by_name: string
          created_at: string
          from_status: string | null
          id: string
          observation: string | null
          to_status: string
          transfer_id: string
        }
        Insert: {
          changed_by: string
          changed_by_name: string
          created_at?: string
          from_status?: string | null
          id?: string
          observation?: string | null
          to_status: string
          transfer_id: string
        }
        Update: {
          changed_by?: string
          changed_by_name?: string
          created_at?: string
          from_status?: string | null
          id?: string
          observation?: string | null
          to_status?: string
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_status_log_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          approved_quantity: number | null
          brand: string
          created_at: string
          dispatched_quantity: number | null
          id: string
          observation: string | null
          priority: string
          product_code: string
          product_name: string
          received_quantity: number | null
          requested_quantity: number
          requester_branch: string
          requester_user_id: string
          source_branch: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_quantity?: number | null
          brand: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          observation?: string | null
          priority?: string
          product_code: string
          product_name: string
          received_quantity?: number | null
          requested_quantity: number
          requester_branch: string
          requester_user_id: string
          source_branch: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_quantity?: number | null
          brand?: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          observation?: string | null
          priority?: string
          product_code?: string
          product_name?: string
          received_quantity?: number | null
          requested_quantity?: number
          requester_branch?: string
          requester_user_id?: string
          source_branch?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
