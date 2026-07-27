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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          criado_em: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          criado_em?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          criado_em?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          aceito_em: string | null
          cargo: string | null
          criado_em: string
          criado_por: string | null
          email: string
          equipe_id: string | null
          expira_em: string
          filial_id: string | null
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          aceito_em?: string | null
          cargo?: string | null
          criado_em?: string
          criado_por?: string | null
          email: string
          equipe_id?: string | null
          expira_em?: string
          filial_id?: string | null
          id?: string
          nome: string
          perfil?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Update: {
          aceito_em?: string | null
          cargo?: string | null
          criado_em?: string
          criado_por?: string | null
          email?: string
          equipe_id?: string | null
          expira_em?: string
          filial_id?: string | null
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: []
      }
      powerbi_tokens: {
        Row: {
          ativo: boolean
          criado_em: string
          escopo: string
          id: string
          token: string
          ultimo_uso_em: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          escopo?: string
          id?: string
          token: string
          ultimo_uso_em?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          escopo?: string
          id?: string
          token?: string
          ultimo_uso_em?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aprovado: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          ativo: boolean
          atualizado_em: string
          avatar_url: string | null
          cargo: string | null
          criado_em: string
          email: string
          equipe_id: string | null
          filial_id: string | null
          id: string
          iniciais: string | null
          navbar_variant: string
          nome: string
          onboarding_completo: boolean
          plano: string
          telefone: string | null
          trial_expires_at: string | null
        }
        Insert: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          cargo?: string | null
          criado_em?: string
          email: string
          equipe_id?: string | null
          filial_id?: string | null
          id: string
          iniciais?: string | null
          navbar_variant?: string
          nome: string
          onboarding_completo?: boolean
          plano?: string
          telefone?: string | null
          trial_expires_at?: string | null
        }
        Update: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          cargo?: string | null
          criado_em?: string
          email?: string
          equipe_id?: string | null
          filial_id?: string | null
          id?: string
          iniciais?: string | null
          navbar_variant?: string
          nome?: string
          onboarding_completo?: boolean
          plano?: string
          telefone?: string | null
          trial_expires_at?: string | null
        }
        Relationships: []
      }
      quick_links: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cor: string
          criado_em: string
          criado_por: string | null
          icone: string
          id: string
          label: string
          ordem: number
          perfis_visiveis: Database["public"]["Enums"]["app_role"][]
          url: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por?: string | null
          icone?: string
          id?: string
          label: string
          ordem?: number
          perfis_visiveis?: Database["public"]["Enums"]["app_role"][]
          url: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por?: string | null
          icone?: string
          id?: string
          label?: string
          ordem?: number
          perfis_visiveis?: Database["public"]["Enums"]["app_role"][]
          url?: string
        }
        Relationships: []
      }
      sheet_sync_config: {
        Row: {
          ativo: boolean
          column_map: Json
          created_at: string
          id: string
          last_pulled_at: string | null
          last_pushed_at: string | null
          owner_user_id: string
          range_a1: string
          sheet_name: string
          spreadsheet_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          column_map?: Json
          created_at?: string
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          owner_user_id: string
          range_a1?: string
          sheet_name?: string
          spreadsheet_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          column_map?: Json
          created_at?: string
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          owner_user_id?: string
          range_a1?: string
          sheet_name?: string
          spreadsheet_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sheet_sync_log: {
        Row: {
          criado_em: string
          direcao: string
          erro: string | null
          id: string
          linhas: number
        }
        Insert: {
          criado_em?: string
          direcao: string
          erro?: string | null
          id?: string
          linhas?: number
        }
        Update: {
          criado_em?: string
          direcao?: string
          erro?: string | null
          id?: string
          linhas?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      metas_individuais: {
        Row: {
          id: string
          usuario_id: string
          filial_id: string | null
          periodo: string
          categoria: string
          valor_meta: number
          valor_realizado: number
          valor_projecao: number
          data_inicio: string
          data_fim: string | null
          status: string
          observacoes: string | null
          criado_por: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          usuario_id: string
          filial_id?: string | null
          periodo?: string
          categoria?: string
          valor_meta?: number
          valor_realizado?: number
          valor_projecao?: number
          data_inicio?: string
          data_fim?: string | null
          status?: string
          observacoes?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          filial_id?: string | null
          periodo?: string
          categoria?: string
          valor_meta?: number
          valor_realizado?: number
          valor_projecao?: number
          data_inicio?: string
          data_fim?: string | null
          status?: string
          observacoes?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      campanhas: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          status: string
          data_inicio: string | null
          data_fim: string | null
          premio: string | null
          regras: string | null
          criado_por: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          status?: string
          data_inicio?: string | null
          data_fim?: string | null
          premio?: string | null
          regras?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          status?: string
          data_inicio?: string | null
          data_fim?: string | null
          premio?: string | null
          regras?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      vendas_diarias: {
        Row: {
          id: string
          usuario_id: string
          filial_id: string | null
          data: string
          categoria: string
          valor_venda: number
          qtd_clientes: number
          ticket_medio: number
          observacao: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          usuario_id: string
          filial_id?: string | null
          data: string
          categoria?: string
          valor_venda?: number
          qtd_clientes?: number
          ticket_medio?: number
          observacao?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          filial_id?: string | null
          data?: string
          categoria?: string
          valor_venda?: number
          qtd_clientes?: number
          ticket_medio?: number
          observacao?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      login_matricula: {
        Row: {
          id: string
          user_id: string
          primeiro_nome: string
          matricula: string
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          primeiro_nome: string
          matricula: string
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          primeiro_nome?: string
          matricula?: string
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      ai_config: {
        Row: {
          id: string
          ativo: boolean
          provider: string
          model: string
          base_url: string
          provider_panel_url: string
          api_key_ciphertext: string | null
          system_prompt: string
          assistant_prompt: string
          tom: string
          nivel_detalhes: string
          criatividade: string
          temperature: number
          idioma: string
          status: string
          last_validation: string | null
          last_error: string | null
          last_tested_by: string | null
          criado_por: string | null
          criado_em: string
          atualizado_em: string
          atualizado_por: string | null
        }
        Insert: {
          id?: string
          ativo?: boolean
          provider?: string
          model?: string
          base_url?: string
          provider_panel_url?: string
          api_key_ciphertext?: string | null
          system_prompt?: string
          assistant_prompt?: string
          tom?: string
          nivel_detalhes?: string
          criatividade?: string
          temperature?: number
          idioma?: string
          status?: string
          last_validation?: string | null
          last_error?: string | null
          last_tested_by?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
          atualizado_por?: string | null
        }
        Update: {
          [key: string]: any
        }
        Relationships: []
      }
      ai_logs: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          pergunta: string
          resposta: string | null
          tempo_ms: number | null
          modelo: string | null
          provedor: string | null
          status: string
          erro: string | null
          metadata: Json | null
          criado_em: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          pergunta: string
          resposta?: string | null
          tempo_ms?: number | null
          modelo?: string | null
          provedor?: string | null
          status?: string
          erro?: string | null
          metadata?: Json | null
          criado_em?: string
        }
        Update: {
          [key: string]: any
        }
        Relationships: []
      }
      ai_prompt_versions: {
        Row: {
          id: string
          config_id: string
          system_prompt: string
          assistant_prompt: string
          criado_por: string | null
          criado_em: string
          observacao: string | null
        }
        Insert: {
          id?: string
          config_id: string
          system_prompt: string
          assistant_prompt: string
          criado_por?: string | null
          criado_em?: string
          observacao?: string | null
        }
        Update: {
          [key: string]: any
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      app_role: "admin" | "gerente" | "supervisor" | "vendedor"
      invite_status: "pendente" | "aceito" | "expirado" | "revogado"
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
      app_role: ["admin", "gerente", "supervisor", "vendedor"],
      invite_status: ["pendente", "aceito", "expirado", "revogado"],
    },
  },
} as const
