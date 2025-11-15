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
          context: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id: string
          context?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          context?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
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
          model_function: string | null
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
          model_function?: string | null
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
          model_function?: string | null
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
      children: {
        Row: {
          contact_email: string | null
          created_at: string | null
          curriculum: string | null
          grade: string | null
          id: string
          settings_json: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          curriculum?: string | null
          grade?: string | null
          id?: string
          settings_json?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          curriculum?: string | null
          grade?: string | null
          id?: string
          settings_json?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
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
      curriculum_task_attempts: {
        Row: {
          answer_data: Json | null
          child_id: string
          created_at: string | null
          id: string
          is_correct: boolean | null
          objective_id: string | null
          success_criterion_id: string | null
          task_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          answer_data?: Json | null
          child_id: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          objective_id?: string | null
          success_criterion_id?: string | null
          task_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          answer_data?: Json | null
          child_id?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          objective_id?: string | null
          success_criterion_id?: string | null
          task_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_task_attempts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_task_attempts_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_task_attempts_success_criterion_id_fkey"
            columns: ["success_criterion_id"]
            isOneToOne: false
            referencedRelation: "success_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_task_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_tokens: {
        Row: {
          child_id: string
          created_at: string | null
          expires_at: string
          guardian_id: string
          id: string
          jti_hash: string
          scope: string | null
          used_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          expires_at: string
          guardian_id: string
          id?: string
          jti_hash: string
          scope?: string | null
          used_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          expires_at?: string
          guardian_id?: string
          id?: string
          jti_hash?: string
          scope?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_tokens_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_tokens_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          domain: string
        }
        Insert: {
          domain: string
        }
        Update: {
          domain?: string
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
          time_spent_seconds: number | null
          user_answer: string
        }
        Insert: {
          attempt_number: number
          created_at?: string
          exercise_history_id: string
          explanation_id?: string | null
          id?: string
          is_correct?: boolean | null
          time_spent_seconds?: number | null
          user_answer: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          exercise_history_id?: string
          explanation_id?: string | null
          id?: string
          is_correct?: boolean | null
          time_spent_seconds?: number | null
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
          correct_answer: string | null
          created_at: string
          exercise_content: string
          exercise_hash: string
          explanation_data: Json
          explanation_image_url: string | null
          id: string
          quality_score: number | null
          subject_id: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          exercise_content: string
          exercise_hash: string
          explanation_data: Json
          explanation_image_url?: string | null
          id?: string
          quality_score?: number | null
          subject_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          exercise_content?: string
          exercise_hash?: string
          explanation_data?: Json
          explanation_image_url?: string | null
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
          explanation_generated_at: string | null
          id: string
          is_correct: boolean | null
          show_correct_answer_to_child: boolean | null
          subject_id: string | null
          time_spent_seconds: number | null
          updated_at: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          created_at?: string
          exercise_content: string
          explanation_generated_at?: string | null
          id?: string
          is_correct?: boolean | null
          show_correct_answer_to_child?: boolean | null
          subject_id?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_answer?: string | null
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          created_at?: string
          exercise_content?: string
          explanation_generated_at?: string | null
          id?: string
          is_correct?: boolean | null
          show_correct_answer_to_child?: boolean | null
          subject_id?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_answer?: string | null
          user_id?: string
        }
        Relationships: []
      }
      explanations_cache: {
        Row: {
          attempt_id: string
          correct_answer: string
          generated_at: string | null
          id: string
          steps_json: Json
          tips_for_parent: string | null
        }
        Insert: {
          attempt_id: string
          correct_answer: string
          generated_at?: string | null
          id?: string
          steps_json: Json
          tips_for_parent?: string | null
        }
        Update: {
          attempt_id?: string
          correct_answer?: string
          generated_at?: string | null
          id?: string
          steps_json?: Json
          tips_for_parent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "explanations_cache_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exercise_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_child_links: {
        Row: {
          child_id: string
          created_at: string | null
          guardian_id: string
          id: string
          permissions_json: Json | null
          relation: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          guardian_id: string
          id?: string
          permissions_json?: Json | null
          relation?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          guardian_id?: string
          id?: string
          permissions_json?: Json | null
          relation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_child_links_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_child_links_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          address_json: Json | null
          billing_customer_id: string | null
          created_at: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_json?: Json | null
          billing_customer_id?: string | null
          created_at?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_json?: Json | null
          billing_customer_id?: string | null
          created_at?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_categories: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_categories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "learning_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_subjects: {
        Row: {
          color_scheme: string
          created_at: string
          icon_name: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          color_scheme: string
          created_at?: string
          icon_name: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color_scheme?: string
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_topics: {
        Row: {
          category_id: string
          created_at: string
          curriculum_country_code: string | null
          curriculum_domain_id: string | null
          curriculum_level_code: string | null
          curriculum_subdomain_id: string | null
          curriculum_subject_id: string | null
          description: string | null
          estimated_duration_minutes: number
          id: string
          is_active: boolean
          name: string
          order_index: number
          quiz_count: number
          slug: string
          updated_at: string
          video_count: number
        }
        Insert: {
          category_id: string
          created_at?: string
          curriculum_country_code?: string | null
          curriculum_domain_id?: string | null
          curriculum_level_code?: string | null
          curriculum_subdomain_id?: string | null
          curriculum_subject_id?: string | null
          description?: string | null
          estimated_duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          quiz_count?: number
          slug: string
          updated_at?: string
          video_count?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          curriculum_country_code?: string | null
          curriculum_domain_id?: string | null
          curriculum_level_code?: string | null
          curriculum_subdomain_id?: string | null
          curriculum_subject_id?: string | null
          description?: string | null
          estimated_duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          quiz_count?: number
          slug?: string
          updated_at?: string
          video_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "learning_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_videos: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          max_age: number | null
          min_age: number | null
          order_index: number
          school_levels: string[] | null
          subject_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          topic_id: string
          transcript: string | null
          updated_at: string
          video_url: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number | null
          order_index?: number
          school_levels?: string[] | null
          subject_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          topic_id: string
          transcript?: string | null
          updated_at?: string
          video_url: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number | null
          order_index?: number
          school_levels?: string[] | null
          subject_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          topic_id?: string
          transcript?: string | null
          updated_at?: string
          video_url?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_videos_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "learning_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_videos_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "learning_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sessions: {
        Row: {
          child_id: string
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          lesson_id: string | null
          notes: string | null
          objective_ids: Json | null
          started_at: string | null
          success_criterion_ids: Json | null
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          objective_ids?: Json | null
          started_at?: string | null
          success_criterion_ids?: Json | null
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          objective_ids?: Json | null
          started_at?: string | null
          success_criterion_ids?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          id: string
          materials: string | null
          misconceptions: string | null
          objective_ids: Json
          student_worksheet: string | null
          success_criterion_ids: Json
          teacher_talk: string | null
          title: string
          unit_id: string | null
        }
        Insert: {
          id: string
          materials?: string | null
          misconceptions?: string | null
          objective_ids?: Json
          student_worksheet?: string | null
          success_criterion_ids?: Json
          teacher_talk?: string | null
          title: string
          unit_id?: string | null
        }
        Update: {
          id?: string
          materials?: string | null
          misconceptions?: string | null
          objective_ids?: Json
          student_worksheet?: string | null
          success_criterion_ids?: Json
          teacher_talk?: string | null
          title?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          domain: string | null
          domain_id: string | null
          id: string
          level: string
          notes_from_prog: string | null
          skill_id: string | null
          subdomain: string
          subdomain_id: string | null
          subject_id: string | null
          text: string
        }
        Insert: {
          domain?: string | null
          domain_id?: string | null
          id: string
          level: string
          notes_from_prog?: string | null
          skill_id?: string | null
          subdomain: string
          subdomain_id?: string | null
          subject_id?: string | null
          text: string
        }
        Update: {
          domain?: string | null
          domain_id?: string | null
          id?: string
          level?: string
          notes_from_prog?: string | null
          skill_id?: string | null
          subdomain?: string
          subdomain_id?: string | null
          subject_id?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["domain"]
          },
        ]
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
      quiz_bank_assignments: {
        Row: {
          bank_id: string
          created_at: string
          id: string
          is_active: boolean | null
          min_completed_in_set: number | null
          topic_id: string | null
          trigger_after_n_videos: number | null
          updated_at: string
          video_ids: string[] | null
        }
        Insert: {
          bank_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_completed_in_set?: number | null
          topic_id?: string | null
          trigger_after_n_videos?: number | null
          updated_at?: string
          video_ids?: string[] | null
        }
        Update: {
          bank_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_completed_in_set?: number | null
          topic_id?: string | null
          trigger_after_n_videos?: number | null
          updated_at?: string
          video_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_bank_assignments_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "quiz_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_bank_attempts: {
        Row: {
          bank_id: string
          created_at: string
          id: string
          max_score: number
          score: number
          took_seconds: number | null
          user_id: string
        }
        Insert: {
          bank_id: string
          created_at?: string
          id?: string
          max_score: number
          score: number
          took_seconds?: number | null
          user_id: string
        }
        Update: {
          bank_id?: string
          created_at?: string
          id?: string
          max_score?: number
          score?: number
          took_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_bank_attempts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "quiz_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_bank_questions: {
        Row: {
          bank_id: string
          created_at: string
          id: string
          payload: Json
          position: number
          updated_at: string
        }
        Insert: {
          bank_id: string
          created_at?: string
          id: string
          payload: Json
          position?: number
          updated_at?: string
        }
        Update: {
          bank_id?: string
          created_at?: string
          id?: string
          payload?: Json
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_bank_questions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "quiz_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_banks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          shuffle: boolean | null
          time_limit_sec: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          shuffle?: boolean | null
          time_limit_sec?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          shuffle?: boolean | null
          time_limit_sec?: number | null
          title?: string
          updated_at?: string
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
      student_mastery: {
        Row: {
          attempts_count: number | null
          child_id: string
          created_at: string | null
          first_attempt_at: string | null
          id: string
          last_attempt_at: string | null
          mastered_at: string | null
          mastery_score: number | null
          status: string
          success_criterion_id: string
          updated_at: string | null
        }
        Insert: {
          attempts_count?: number | null
          child_id: string
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          last_attempt_at?: string | null
          mastered_at?: string | null
          mastery_score?: number | null
          status?: string
          success_criterion_id: string
          updated_at?: string | null
        }
        Update: {
          attempts_count?: number | null
          child_id?: string
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          last_attempt_at?: string | null
          mastered_at?: string | null
          mastery_score?: number | null
          status?: string
          success_criterion_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_mastery_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mastery_success_criterion_id_fkey"
            columns: ["success_criterion_id"]
            isOneToOne: false
            referencedRelation: "success_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      subdomains: {
        Row: {
          domain: string | null
          id: number
          subdomain: string
        }
        Insert: {
          domain?: string | null
          id?: number
          subdomain: string
        }
        Update: {
          domain?: string | null
          id?: number
          subdomain?: string
        }
        Relationships: [
          {
            foreignKeyName: "subdomains_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["domain"]
          },
        ]
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
      success_criteria: {
        Row: {
          domain_id: string | null
          id: string
          objective_id: string | null
          skill_id: string | null
          subdomain_id: string | null
          subject_id: string | null
          text: string
        }
        Insert: {
          domain_id?: string | null
          id: string
          objective_id?: string | null
          skill_id?: string | null
          subdomain_id?: string | null
          subject_id?: string | null
          text: string
        }
        Update: {
          domain_id?: string | null
          id?: string
          objective_id?: string | null
          skill_id?: string | null
          subdomain_id?: string | null
          subject_id?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_criteria_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          difficulty: string | null
          domain_id: string | null
          id: string
          rubric: string | null
          skill_id: string | null
          solution: string | null
          source: string | null
          stem: string
          subdomain_id: string | null
          subject_id: string | null
          success_criterion_id: string | null
          tags: string[] | null
          type: string
        }
        Insert: {
          difficulty?: string | null
          domain_id?: string | null
          id: string
          rubric?: string | null
          skill_id?: string | null
          solution?: string | null
          source?: string | null
          stem: string
          subdomain_id?: string | null
          subject_id?: string | null
          success_criterion_id?: string | null
          tags?: string[] | null
          type: string
        }
        Update: {
          difficulty?: string | null
          domain_id?: string | null
          id?: string
          rubric?: string | null
          skill_id?: string | null
          solution?: string | null
          source?: string | null
          stem?: string
          subdomain_id?: string | null
          subject_id?: string | null
          success_criterion_id?: string | null
          tags?: string[] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_success_criterion_id_fkey"
            columns: ["success_criterion_id"]
            isOneToOne: false
            referencedRelation: "success_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          domain: string
          duration_weeks: number | null
          id: string
          level: string
          subdomain: string
          title: string
        }
        Insert: {
          domain: string
          duration_weeks?: number | null
          id: string
          level: string
          subdomain: string
          title: string
        }
        Update: {
          domain?: string
          duration_weeks?: number | null
          id?: string
          level?: string
          subdomain?: string
          title?: string
        }
        Relationships: []
      }
      user_learning_progress: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          last_watched_position_seconds: number
          progress_percentage: number
          progress_type: string
          quiz_score: number | null
          subject_id: string | null
          time_spent_seconds: number
          topic_id: string | null
          updated_at: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          last_watched_position_seconds?: number
          progress_percentage?: number
          progress_type: string
          quiz_score?: number | null
          subject_id?: string | null
          time_spent_seconds?: number
          topic_id?: string | null
          updated_at?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          last_watched_position_seconds?: number
          progress_percentage?: number
          progress_type?: string
          quiz_score?: number | null
          subject_id?: string | null
          time_spent_seconds?: number
          topic_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_progress_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "learning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_progress_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "learning_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "learning_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "learning_videos"
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
          contact_email: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          level: string | null
          phone_number: string | null
          style: string | null
          updated_at: string
          user_type: string
          username: string | null
          username_set_at: string | null
        }
        Insert: {
          contact_email?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          level?: string | null
          phone_number?: string | null
          style?: string | null
          updated_at?: string
          user_type: string
          username?: string | null
          username_set_at?: string | null
        }
        Update: {
          contact_email?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          level?: string | null
          phone_number?: string | null
          style?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          username_set_at?: string | null
        }
        Relationships: []
      }
      video_quizzes: {
        Row: {
          correct_answer_index: number
          created_at: string
          explanation: string
          id: string
          options: string[]
          order_index: number
          question: string
          question_latex: string | null
          timestamp_seconds: number
          updated_at: string
          video_id: string
          xp_reward: number
        }
        Insert: {
          correct_answer_index: number
          created_at?: string
          explanation: string
          id?: string
          options: string[]
          order_index?: number
          question: string
          question_latex?: string | null
          timestamp_seconds?: number
          updated_at?: string
          video_id: string
          xp_reward?: number
        }
        Update: {
          correct_answer_index?: number
          created_at?: string
          explanation?: string
          id?: string
          options?: string[]
          order_index?: number
          question?: string
          question_latex?: string | null
          timestamp_seconds?: number
          updated_at?: string
          video_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_quizzes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "learning_videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      configured_models: {
        Row: {
          default_model_id: string | null
          fallback_primary_model_id: string | null
          fallback_secondary_model_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_vault_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: undefined
      }
      get_model_with_fallback: {
        Args: never
        Returns: {
          default_model_id: string
          fallback_primary_model_id: string
          fallback_secondary_model_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_guardian_of_child: {
        Args: { _child_user_id: string; _guardian_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student" | "parent" | "guardian"
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
      app_role: ["admin", "moderator", "student", "parent", "guardian"],
    },
  },
} as const
