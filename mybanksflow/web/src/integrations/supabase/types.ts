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
      bank_accounts: {
        Row: {
          account_type: string
          bank: string
          color: string
          created_at: string
          iban: string
          id: string
          name: string
          starting_balance: number
          user_id: string
        }
        Insert: {
          account_type?: string
          bank: string
          color?: string
          created_at?: string
          iban: string
          id?: string
          name: string
          starting_balance?: number
          user_id: string
        }
        Update: {
          account_type?: string
          bank?: string
          color?: string
          created_at?: string
          iban?: string
          id?: string
          name?: string
          starting_balance?: number
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          month: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          parent_category_id: string | null
          sort_order: number
          type: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          parent_category_id?: string | null
          sort_order?: number
          type: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          parent_category_id?: string | null
          sort_order?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_rules: {
        Row: {
          category_id: string
          created_at: string
          id: string
          pattern: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          pattern: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          pattern?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          iban: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          iban?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          iban?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_attachments: {
        Row: {
          contract_id: string
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_attachments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount: number
          cancellation_period: string
          category_id: string | null
          contact_id: string | null
          created_at: string
          customer_number: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          payment_frequency: string
          planned_transaction_id: string | null
          policy_number: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          cancellation_period?: string
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          customer_number?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_frequency?: string
          planned_transaction_id?: string | null
          policy_number?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cancellation_period?: string
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          customer_number?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_frequency?: string
          planned_transaction_id?: string | null
          policy_number?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_planned_transaction_id_fkey"
            columns: ["planned_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_planned_transaction_id_fkey"
            columns: ["planned_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_config: {
        Row: {
          encryption_key: string
          id: number
        }
        Insert: {
          encryption_key: string
          id?: number
        }
        Update: {
          encryption_key?: string
          id?: number
        }
        Relationships: []
      }
      feature_request_votes: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      import_errors: {
        Row: {
          bank: string
          created_at: string
          error_message: string
          file_name: string
          file_preview: string | null
          id: string
          user_id: string
        }
        Insert: {
          bank: string
          created_at?: string
          error_message: string
          file_name: string
          file_preview?: string | null
          id?: string
          user_id: string
        }
        Update: {
          bank?: string
          created_at?: string
          error_message?: string
          file_name?: string
          file_preview?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_currency: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank: string | null
          bank_account_id: string | null
          category_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          date: string
          description: string
          end_date: string | null
          frequency: string | null
          id: string
          is_planned: boolean
          is_recurring: boolean
          original_description: string | null
          payment_reference: string | null
          planned_transaction_id: string | null
          transaction_code: string | null
          transaction_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          bank?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          description: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          is_planned?: boolean
          is_recurring?: boolean
          original_description?: string | null
          payment_reference?: string | null
          planned_transaction_id?: string | null
          transaction_code?: string | null
          transaction_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          bank?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          description?: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          is_planned?: boolean
          is_recurring?: boolean
          original_description?: string | null
          payment_reference?: string | null
          planned_transaction_id?: string | null
          transaction_code?: string | null
          transaction_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_planned_transaction_id_fkey"
            columns: ["planned_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_planned_transaction_id_fkey"
            columns: ["planned_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_decrypted"
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
      contacts_decrypted: {
        Row: {
          created_at: string | null
          iban: string | null
          id: string | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          iban?: never
          id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          iban?: never
          id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions_decrypted: {
        Row: {
          amount: number | null
          bank: string | null
          bank_account_id: string | null
          category_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          date: string | null
          description: string | null
          end_date: string | null
          frequency: string | null
          id: string | null
          is_planned: boolean | null
          is_recurring: boolean | null
          original_description: string | null
          payment_reference: string | null
          planned_transaction_id: string | null
          transaction_code: string | null
          transaction_type: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          bank?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string | null
          is_planned?: boolean | null
          is_recurring?: boolean | null
          original_description?: never
          payment_reference?: never
          planned_transaction_id?: string | null
          transaction_code?: string | null
          transaction_type?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          bank?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string | null
          is_planned?: boolean | null
          is_recurring?: boolean | null
          original_description?: never
          payment_reference?: never
          planned_transaction_id?: string | null
          transaction_code?: string | null
          transaction_type?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_planned_transaction_id_fkey"
            columns: ["planned_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_planned_transaction_id_fkey"
            columns: ["planned_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_rule_counts: {
        Args: never
        Returns: {
          count: number
          user_id: string
        }[]
      }
      admin_tx_counts: {
        Args: never
        Returns: {
          count: number
          user_id: string
        }[]
      }
      decrypt_text: { Args: { ciphertext: string }; Returns: string }
      encrypt_text: { Args: { plaintext: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
