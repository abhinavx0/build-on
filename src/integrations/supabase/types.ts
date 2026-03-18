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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          application_id: string
          applied_at: string
          drive_id: string
          is_eligible: boolean
          reg_number: string
        }
        Insert: {
          application_id?: string
          applied_at?: string
          drive_id: string
          is_eligible?: boolean
          reg_number: string
        }
        Update: {
          application_id?: string
          applied_at?: string
          drive_id?: string
          is_eligible?: boolean
          reg_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["drive_id"]
          },
          {
            foreignKeyName: "applications_reg_number_fkey"
            columns: ["reg_number"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["reg_number"]
          },
        ]
      }
      drives: {
        Row: {
          company_name: string
          created_at: string
          created_by: string | null
          description: string | null
          drive_date: string
          drive_id: string
          eligibility_criteria: Json
          is_active: boolean
          registration_deadline: string
          shortlist_stale: boolean | null
        }
        Insert: {
          company_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_date: string
          drive_id?: string
          eligibility_criteria?: Json
          is_active?: boolean
          registration_deadline: string
          shortlist_stale?: boolean | null
        }
        Update: {
          company_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_date?: string
          drive_id?: string
          eligibility_criteria?: Json
          is_active?: boolean
          registration_deadline?: string
          shortlist_stale?: boolean | null
        }
        Relationships: []
      }
      placement_change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
          reg_number: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          reg_number: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          reg_number?: string
        }
        Relationships: []
      }
      placement_records: {
        Row: {
          change_reason: string | null
          company_name: string | null
          id: string
          package_lpa: number | null
          placed_date: string | null
          reg_number: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          change_reason?: string | null
          company_name?: string | null
          id?: string
          package_lpa?: number | null
          placed_date?: string | null
          reg_number: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          change_reason?: string | null
          company_name?: string | null
          id?: string
          package_lpa?: number | null
          placed_date?: string | null
          reg_number?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placement_records_reg_number_fkey"
            columns: ["reg_number"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["reg_number"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          reg_number: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          reg_number?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          reg_number?: string | null
          role?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          batch_year: number
          branch: string
          cgpa: number
          created_at: string
          email: string
          name: string
          phone: string | null
          reg_number: string
          section: string | null
          user_id: string | null
        }
        Insert: {
          batch_year: number
          branch: string
          cgpa: number
          created_at?: string
          email: string
          name: string
          phone?: string | null
          reg_number: string
          section?: string | null
          user_id?: string | null
        }
        Update: {
          batch_year?: number
          branch?: string
          cgpa?: number
          created_at?: string
          email?: string
          name?: string
          phone?: string | null
          reg_number?: string
          section?: string | null
          user_id?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "student"
      placement_status:
        | "unplaced"
        | "placed"
        | "offer_pending"
        | "offer_revoked"
        | "eligible_for_upgrade"
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
      app_role: ["admin", "coordinator", "student"],
      placement_status: [
        "unplaced",
        "placed",
        "offer_pending",
        "offer_revoked",
        "eligible_for_upgrade",
      ],
    },
  },
} as const
