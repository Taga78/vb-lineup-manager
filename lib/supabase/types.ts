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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendances: {
        Row: {
          created_at: string
          id: string
          marked_by: string | null
          player_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_by?: string | null
          player_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_by?: string | null
          player_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          court_number: number
          created_at: string
          id: string
          match_order: number
          round: string
          score_a: number | null
          score_b: number | null
          session_id: string
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string | null
          team_b_id: string | null
          winner_id: string | null
        }
        Insert: {
          court_number?: number
          created_at?: string
          id?: string
          match_order?: number
          round: string
          score_a?: number | null
          score_b?: number | null
          session_id: string
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Update: {
          court_number?: number
          created_at?: string
          id?: string
          match_order?: number
          round?: string
          score_a?: number | null
          score_b?: number | null
          session_id?: string
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          gender: string | null
          id: string
          is_active: boolean
          is_guest: boolean
          name: string
          profile_id: string | null
          skill_attack: number
          skill_defense: number
          skill_pass: number
          skill_service: number
          skills_verified: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          is_guest?: boolean
          name: string
          profile_id?: string | null
          skill_attack?: number
          skill_defense?: number
          skill_pass?: number
          skill_service?: number
          skills_verified?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          is_guest?: boolean
          name?: string
          profile_id?: string | null
          skill_attack?: number
          skill_defense?: number
          skill_pass?: number
          skill_service?: number
          skills_verified?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          days_of_week: number[]
          id: string
          is_active: boolean
          label: string
          nb_courts_planned: number
          open_before_minutes: number
          preferred_team_size: number
          session_label_template: string | null
          session_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_of_week: number[]
          id?: string
          is_active?: boolean
          label: string
          nb_courts_planned?: number
          open_before_minutes?: number
          preferred_team_size?: number
          session_label_template?: string | null
          session_time?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          id?: string
          is_active?: boolean
          label?: string
          nb_courts_planned?: number
          open_before_minutes?: number
          preferred_team_size?: number
          session_label_template?: string | null
          session_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_exclusions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          schedule_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          schedule_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          schedule_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exclusions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          format: Json | null
          id: string
          is_open: boolean
          label: string | null
          nb_courts_planned: number
          preferred_team_size: number
          recurring_schedule_id: string | null
          type: Database["public"]["Enums"]["session_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          format?: Json | null
          id?: string
          is_open?: boolean
          label?: string | null
          nb_courts_planned: number
          preferred_team_size: number
          recurring_schedule_id?: string | null
          type?: Database["public"]["Enums"]["session_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          format?: Json | null
          id?: string
          is_open?: boolean
          label?: string | null
          nb_courts_planned?: number
          preferred_team_size?: number
          recurring_schedule_id?: string | null
          type?: Database["public"]["Enums"]["session_type"]
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_recurring_schedule_id_fkey"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          created_at: string
          id: string
          losses: number
          matches_played: number
          player_id: string | null
          points: number
          points_diff: number
          rank: number | null
          session_id: string
          team_id: string | null
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          losses?: number
          matches_played?: number
          player_id?: string | null
          points?: number
          points_diff?: number
          rank?: number | null
          session_id: string
          team_id?: string | null
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          losses?: number
          matches_played?: number
          player_id?: string | null
          points?: number
          points_diff?: number
          rank?: number | null
          session_id?: string
          team_id?: string | null
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          id: string
          player_id: string
          team_id: string
        }
        Insert: {
          id?: string
          player_id: string
          team_id: string
        }
        Update: {
          id?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          court_number: number
          created_at: string
          id: string
          name: string | null
          session_id: string
        }
        Insert: {
          court_number: number
          created_at?: string
          id?: string
          name?: string | null
          session_id: string
        }
        Update: {
          court_number?: number
          created_at?: string
          id?: string
          name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_recurring_schedules: { Args: never; Returns: undefined }
    }
    Enums: {
      match_status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED"
      session_type: "TRAINING" | "TOURNAMENT"
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
      match_status: ["SCHEDULED", "IN_PROGRESS", "FINISHED"],
      session_type: ["TRAINING", "TOURNAMENT"],
    },
  },
} as const
