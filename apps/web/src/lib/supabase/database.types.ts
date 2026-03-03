export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      data_sources: {
        Row: {
          created_at: string
          id: string
          key: string
          license: string | null
          name: string
          update_frequency: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          license?: string | null
          name: string
          update_frequency?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          license?: string | null
          name?: string
          update_frequency?: string | null
          url?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          day: string
          icon: string | null
          id: string
          label_en: string | null
          label_fr: string
          scope: string
          severity: number
          source_url: string | null
        }
        Insert: {
          created_at?: string
          day: string
          icon?: string | null
          id?: string
          label_en?: string | null
          label_fr: string
          scope: string
          severity?: number
          source_url?: string | null
        }
        Update: {
          created_at?: string
          day?: string
          icon?: string | null
          id?: string
          label_en?: string | null
          label_fr?: string
          scope?: string
          severity?: number
          source_url?: string | null
        }
        Relationships: []
      }
      fci_daily: {
        Row: {
          components: Json
          created_at: string
          day: string
          methodology_version: string
          score: number
          weights: Json
        }
        Insert: {
          components?: Json
          created_at?: string
          day: string
          methodology_version?: string
          score: number
          weights?: Json
        }
        Update: {
          components?: Json
          created_at?: string
          day?: string
          methodology_version?: string
          score?: number
          weights?: Json
        }
        Relationships: []
      }
      fuel_daily_agg: {
        Row: {
          avg_price_eur_per_l: number
          created_at: string
          day: string
          fuel_code: string
          max_price_eur_per_l: number | null
          min_price_eur_per_l: number | null
          sample_count: number | null
          source_id: string | null
        }
        Insert: {
          avg_price_eur_per_l: number
          created_at?: string
          day: string
          fuel_code: string
          max_price_eur_per_l?: number | null
          min_price_eur_per_l?: number | null
          sample_count?: number | null
          source_id?: string | null
        }
        Update: {
          avg_price_eur_per_l?: number
          created_at?: string
          day?: string
          fuel_code?: string
          max_price_eur_per_l?: number | null
          min_price_eur_per_l?: number | null
          sample_count?: number | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fuel_daily_agg_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'data_sources'
            referencedColumns: ['id']
          },
        ]
      }
      newsletter_signups: {
        Row: {
          created_at: string
          email: string
          fingerprint_hash: string | null
          id: string
          ip_hash: string | null
          locale: string
          source: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          locale?: string
          source?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          locale?: string
          source?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          day: string
          fingerprint_hash: string
          id: string
          ip_hash: string | null
          scope: string
          user_agent: string | null
          vote: string
        }
        Insert: {
          created_at?: string
          day?: string
          fingerprint_hash: string
          id?: string
          ip_hash?: string | null
          scope: string
          user_agent?: string | null
          vote: string
        }
        Update: {
          created_at?: string
          day?: string
          fingerprint_hash?: string
          id?: string
          ip_hash?: string | null
          scope?: string
          user_agent?: string | null
          vote?: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
