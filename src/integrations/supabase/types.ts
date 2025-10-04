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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      ai_model_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_value: string
          name: string
          provider_id: string
          updated_at: string
          vault_secret_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_value: string
          name: string
          provider_id: string
          updated_at?: string
          vault_secret_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_value?: string
          name?: string
          provider_id?: string
          updated_at?: string
          vault_secret_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_model_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_providers: {
        Row: {
          api_base_url: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          api_base_url: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          api_base_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          capabilities: string[] | null
          context_window: number | null
          created_at: string
          id: string
          is_active: boolean
          max_tokens: number | null
          model_id: string
          name: string
          pricing_input: number | null
          pricing_output: number | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          capabilities?: string[] | null
          context_window?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model_id: string
          name: string
          pricing_input?: number | null
          pricing_output?: number | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          capabilities?: string[] | null
          context_window?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model_id?: string
          name?: string
          pricing_input?: number | null
          pricing_output?: number | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_model_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exercise_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          exercise_history_id: string
          explanation_id: string | null
          id: string
          is_correct: boolean | null
          user_answer: string
        }
        Insert: {
          attempt_number: number
          created_at?: string
          exercise_history_id: string
          explanation_id?: string | null
          id?: string
          is_correct?: boolean | null
          user_answer: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          exercise_history_id?: string
          explanation_id?: string | null
          id?: string
          is_correct?: boolean | null
          user_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_exercise_history_id_fkey"
            columns: ["exercise_history_id"]
            isOneToOne: false
            referencedRelation: "exercise_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_attempts_explanation_id_fkey"
            columns: ["explanation_id"]
            isOneToOne: false
            referencedRelation: "exercise_explanations_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_explanations_cache: {
        Row: {
          created_at: string
          exercise_content: string
          exercise_hash: string
          explanation_data: Json
          id: string
          quality_score: number | null
          subject_id: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          exercise_content: string
          exercise_hash: string
          explanation_data: Json
          id?: string
          quality_score?: number | null
          subject_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          exercise_content?: string
          exercise_hash?: string
          explanation_data?: Json
          id?: string
          quality_score?: number | null
          subject_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      exercise_history: {
        Row: {
          attempts_count: number | null
          created_at: string
          exercise_content: string
          id: string
          is_correct: boolean | null
          subject_id: string | null
          updated_at: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          created_at?: string
          exercise_content: string
          id?: string
          is_correct?: boolean | null
          subject_id?: string | null
          updated_at?: string
          user_answer?: string | null
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          created_at?: string
          exercise_content?: string
          id?: string
          is_correct?: boolean | null
          subject_id?: string | null
          updated_at?: string
          user_answer?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parent_child: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          auto_activate: boolean | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          prompt_content: string
          subject: string | null
          tags: string[] | null
          updated_at: string | null
          usage_type: string
        }
        Insert: {
          auto_activate?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          prompt_content: string
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
          usage_type: string
        }
        Update: {
          auto_activate?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          prompt_content?: string
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
          usage_type?: string
        }
        Relationships: []
      }
      school_levels: {
        Row: {
          country_code: string
          created_at: string | null
          id: string
          level_code: string
          level_name: string
          sort_order: number | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          id?: string
          level_code: string
          level_name: string
          sort_order?: number | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          id?: string
          level_code?: string
          level_name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_levels_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      sidebar_tabs: {
        Row: {
          created_at: string | null
          icon_name: string
          id: string
          is_visible: boolean | null
          path: string
          sort_order: number | null
          title: string
          updated_at: string | null
          user_type: string
        }
        Insert: {
          created_at?: string | null
          icon_name: string
          id?: string
          is_visible?: boolean | null
          path: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
          user_type?: string
        }
        Update: {
          created_at?: string | null
          icon_name?: string
          id?: string
          is_visible?: boolean | null
          path?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      subject_prompt_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          prompt_template_id: string | null
          subject_id: string
          usage_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          prompt_template_id?: string | null
          subject_id: string
          usage_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          prompt_template_id?: string | null
          subject_id?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_prompt_assignments_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          level: string | null
          phone_number: string | null
          style: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          level?: string | null
          phone_number?: string | null
          style?: string | null
          updated_at?: string
          user_type: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          level?: string | null
          phone_number?: string | null
          style?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_vault_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student" | "parent"
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
      app_role: ["admin", "moderator", "student", "parent"],
    },
  },
} as const
