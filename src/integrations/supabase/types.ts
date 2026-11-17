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
      access_audit_logs: {
        Row: {
          access_user_id: string | null
          action: string
          changed_at: string
          changed_by: string | null
          client_id: string | null
          directory_id: string | null
          directory_name: string
          id: string
          new_read_status:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          new_write_status:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          previous_read_status:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          previous_write_status:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          user_name: string
        }
        Insert: {
          access_user_id?: string | null
          action: string
          changed_at?: string
          changed_by?: string | null
          client_id?: string | null
          directory_id?: string | null
          directory_name: string
          id?: string
          new_read_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          new_write_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          previous_read_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          previous_write_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          user_name: string
        }
        Update: {
          access_user_id?: string | null
          action?: string
          changed_at?: string
          changed_by?: string | null
          client_id?: string | null
          directory_id?: string | null
          directory_name?: string
          id?: string
          new_read_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          new_write_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          previous_read_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          previous_write_status?:
            | Database["public"]["Enums"]["access_permission_status"]
            | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_logs_access_user_id_fkey"
            columns: ["access_user_id"]
            isOneToOne: false
            referencedRelation: "access_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_audit_logs_directory_id_fkey"
            columns: ["directory_id"]
            isOneToOne: false
            referencedRelation: "access_directories"
            referencedColumns: ["id"]
          },
        ]
      }
      access_directories: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          id: string
          is_quality_only: boolean
          name: string
          notes: string | null
          parent_id: string | null
          sort_order: number
          source_row: number | null
          source_sheet: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          id?: string
          is_quality_only?: boolean
          name: string
          notes?: string | null
          parent_id?: string | null
          sort_order?: number
          source_row?: number | null
          source_sheet?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          id?: string
          is_quality_only?: boolean
          name?: string
          notes?: string | null
          parent_id?: string | null
          sort_order?: number
          source_row?: number | null
          source_sheet?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_directories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_directories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "access_directories"
            referencedColumns: ["id"]
          },
        ]
      }
      access_permissions: {
        Row: {
          access_user_id: string
          created_at: string
          directory_id: string
          id: string
          read_status: Database["public"]["Enums"]["access_permission_status"]
          updated_at: string
          write_status: Database["public"]["Enums"]["access_permission_status"]
        }
        Insert: {
          access_user_id: string
          created_at?: string
          directory_id: string
          id?: string
          read_status?: Database["public"]["Enums"]["access_permission_status"]
          updated_at?: string
          write_status?: Database["public"]["Enums"]["access_permission_status"]
        }
        Update: {
          access_user_id?: string
          created_at?: string
          directory_id?: string
          id?: string
          read_status?: Database["public"]["Enums"]["access_permission_status"]
          updated_at?: string
          write_status?: Database["public"]["Enums"]["access_permission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "access_permissions_access_user_id_fkey"
            columns: ["access_user_id"]
            isOneToOne: false
            referencedRelation: "access_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_permissions_directory_id_fkey"
            columns: ["directory_id"]
            isOneToOne: false
            referencedRelation: "access_directories"
            referencedColumns: ["id"]
          },
        ]
      }
      access_scopes: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          path: string
          permission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          path: string
          permission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          path?: string
          permission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_scopes_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "access_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      access_users: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          department: string | null
          id: string
          is_quality_manager: boolean
          name: string
          notes: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          department?: string | null
          id?: string
          is_quality_manager?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          department?: string | null
          id?: string
          is_quality_manager?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string
          contracted_hours: number
          created_at: string
          end_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          recurrence_months: number
          start_date: string
          updated_at: string
        }
        Insert: {
          client_id: string
          contracted_hours: number
          created_at?: string
          end_date: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          recurrence_months?: number
          start_date: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          contracted_hours?: number
          created_at?: string
          end_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          recurrence_months?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          created_at: string
          data: string
          id: string
          maquina_id: string
          problemas: string | null
          recomendacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          maquina_id: string
          problemas?: string | null
          recomendacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          maquina_id?: string
          problemas?: string | null
          recomendacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          armazenamento_gb: number | null
          client_id: string
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          processador: string | null
          ram_gb: number | null
          setor: string | null
          sistema_operacional: string | null
          tipo_disco: string | null
          updated_at: string
          usuario: string | null
        }
        Insert: {
          armazenamento_gb?: number | null
          client_id: string
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          processador?: string | null
          ram_gb?: number | null
          setor?: string | null
          sistema_operacional?: string | null
          tipo_disco?: string | null
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          armazenamento_gb?: number | null
          client_id?: string
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          processador?: string | null
          ram_gb?: number | null
          setor?: string | null
          sistema_operacional?: string | null
          tipo_disco?: string | null
          updated_at?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products_used: {
        Row: {
          client_id: string
          competence_month: string
          created_at: string
          id: string
          notes: string | null
          product_name: string
          quantity: number
          updated_at: string
        }
        Insert: {
          client_id: string
          competence_month: string
          created_at?: string
          id?: string
          notes?: string | null
          product_name: string
          quantity: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          competence_month?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_name?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_used_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      tests: {
        Row: {
          antivirus: boolean
          atualizacoes: boolean
          created_at: string
          diagnostico_id: string
          disco_ok: boolean
          id: string
          observacoes: string | null
          ram_ok: boolean
          sistema_ok: boolean
          temperatura: string | null
        }
        Insert: {
          antivirus?: boolean
          atualizacoes?: boolean
          created_at?: string
          diagnostico_id: string
          disco_ok?: boolean
          id?: string
          observacoes?: string | null
          ram_ok?: boolean
          sistema_ok?: boolean
          temperatura?: string | null
        }
        Update: {
          antivirus?: boolean
          atualizacoes?: boolean
          created_at?: string
          diagnostico_id?: string
          disco_ok?: boolean
          id?: string
          observacoes?: string | null
          ram_ok?: boolean
          sistema_ok?: boolean
          temperatura?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          billed_hours: number
          category: string | null
          client_id: string
          created_at: string
          created_by_user_id: string
          description: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          observations: string | null
          requester_name: string
          service_date: string
          service_performed: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          billed_hours: number
          category?: string | null
          client_id: string
          created_at?: string
          created_by_user_id: string
          description: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          observations?: string | null
          requester_name: string
          service_date: string
          service_performed?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          billed_hours?: number
          category?: string | null
          client_id?: string
          created_at?: string
          created_by_user_id?: string
          description?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          observations?: string | null
          requester_name?: string
          service_date?: string
          service_performed?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      admin_batch_save_permissions: {
        Args: { p_changes: Json }
        Returns: undefined
      }
      admin_save_permission: {
        Args: {
          p_access_user_id: string
          p_directory_id: string
          p_read_status: Database["public"]["Enums"]["access_permission_status"]
          p_scope_notes?: string
          p_scope_paths?: string[]
          p_write_status: Database["public"]["Enums"]["access_permission_status"]
        }
        Returns: string
      }
      can_read_directory: { Args: { _directory_id: string }; Returns: boolean }
      current_access_user_id: { Args: never; Returns: string }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_permission_status: "granted" | "denied" | "limited" | "undefined"
      app_role: "ADMIN" | "CLIENT_USER"
      ticket_status: "open" | "in_progress" | "completed"
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
      access_permission_status: ["granted", "denied", "limited", "undefined"],
      app_role: ["ADMIN", "CLIENT_USER"],
      ticket_status: ["open", "in_progress", "completed"],
    },
  },
} as const
