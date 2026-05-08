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
      chat_canali: {
        Row: {
          created_at: string
          created_by: string | null
          descrizione: string | null
          id: string
          nome: string
          solo_manager_scrive: boolean
          tipo: Database["public"]["Enums"]["chat_canale_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome: string
          solo_manager_scrive?: boolean
          tipo?: Database["public"]["Enums"]["chat_canale_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome?: string
          solo_manager_scrive?: boolean
          tipo?: Database["public"]["Enums"]["chat_canale_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      chat_membri: {
        Row: {
          canale_id: string
          created_at: string
          id: string
          ultimo_letto_at: string | null
          user_id: string
        }
        Insert: {
          canale_id: string
          created_at?: string
          id?: string
          ultimo_letto_at?: string | null
          user_id: string
        }
        Update: {
          canale_id?: string
          created_at?: string
          id?: string
          ultimo_letto_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_membri_canale_id_fkey"
            columns: ["canale_id"]
            isOneToOne: false
            referencedRelation: "chat_canali"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messaggi: {
        Row: {
          autore_id: string
          canale_id: string
          contenuto: string
          created_at: string
          id: string
        }
        Insert: {
          autore_id: string
          canale_id: string
          contenuto: string
          created_at?: string
          id?: string
        }
        Update: {
          autore_id?: string
          canale_id?: string
          contenuto?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messaggi_canale_id_fkey"
            columns: ["canale_id"]
            isOneToOne: false
            referencedRelation: "chat_canali"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilita: {
        Row: {
          created_at: string
          dipendente_id: string
          giorno_settimana: number
          id: string
          note: string | null
          ora_fine: string
          ora_inizio: string
          tipo: Database["public"]["Enums"]["disponibilita_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          dipendente_id: string
          giorno_settimana: number
          id?: string
          note?: string | null
          ora_fine: string
          ora_inizio: string
          tipo?: Database["public"]["Enums"]["disponibilita_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          dipendente_id?: string
          giorno_settimana?: number
          id?: string
          note?: string | null
          ora_fine?: string
          ora_inizio?: string
          tipo?: Database["public"]["Enums"]["disponibilita_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      pause: {
        Row: {
          created_at: string
          dipendente_id: string
          fine: string | null
          id: string
          inizio: string
          note: string | null
          timbratura_id: string
          tipo: Database["public"]["Enums"]["pausa_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          dipendente_id: string
          fine?: string | null
          id?: string
          inizio?: string
          note?: string | null
          timbratura_id: string
          tipo?: Database["public"]["Enums"]["pausa_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          dipendente_id?: string
          fine?: string | null
          id?: string
          inizio?: string
          note?: string | null
          timbratura_id?: string
          tipo?: Database["public"]["Enums"]["pausa_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pause_timbratura_id_fkey"
            columns: ["timbratura_id"]
            isOneToOne: false
            referencedRelation: "timbrature"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cognome: string
          created_at: string
          email: string | null
          id: string
          nome: string
          reparto: string
          ruolo_lavoro: string
          updated_at: string
        }
        Insert: {
          cognome?: string
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          reparto?: string
          ruolo_lavoro?: string
          updated_at?: string
        }
        Update: {
          cognome?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          reparto?: string
          ruolo_lavoro?: string
          updated_at?: string
        }
        Relationships: []
      }
      timbrature: {
        Row: {
          created_at: string
          data: string
          dipendente_id: string
          foto_in_url: string | null
          foto_out_url: string | null
          id: string
          lat_in: number | null
          lat_out: number | null
          lng_in: number | null
          lng_out: number | null
          note: string | null
          orario_clock_in: string
          orario_clock_out: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          dipendente_id: string
          foto_in_url?: string | null
          foto_out_url?: string | null
          id?: string
          lat_in?: number | null
          lat_out?: number | null
          lng_in?: number | null
          lng_out?: number | null
          note?: string | null
          orario_clock_in: string
          orario_clock_out?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          dipendente_id?: string
          foto_in_url?: string | null
          foto_out_url?: string | null
          id?: string
          lat_in?: number | null
          lat_out?: number | null
          lng_in?: number | null
          lng_out?: number | null
          note?: string | null
          orario_clock_in?: string
          orario_clock_out?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timbrature_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      turni: {
        Row: {
          created_at: string
          data: string
          dipendente_id: string
          id: string
          location: string
          note: string | null
          ora_fine: string
          ora_inizio: string
          pubblicato: boolean
          tipo_turno: Database["public"]["Enums"]["tipo_turno"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          dipendente_id: string
          id?: string
          location?: string
          note?: string | null
          ora_fine: string
          ora_inizio: string
          pubblicato?: boolean
          tipo_turno: Database["public"]["Enums"]["tipo_turno"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          dipendente_id?: string
          id?: string
          location?: string
          note?: string | null
          ora_fine?: string
          ora_inizio?: string
          pubblicato?: boolean
          tipo_turno?: Database["public"]["Enums"]["tipo_turno"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turni_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      turni_template: {
        Row: {
          created_at: string
          created_by: string
          descrizione: string | null
          id: string
          nome: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          descrizione?: string | null
          id?: string
          nome: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          descrizione?: string | null
          id?: string
          nome?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      turno_swap_requests: {
        Row: {
          a_dipendente: string
          created_at: string
          da_dipendente: string
          decisione_at: string | null
          decisione_di: string | null
          id: string
          motivo: string | null
          status: Database["public"]["Enums"]["swap_status"]
          turno_id: string
          updated_at: string
        }
        Insert: {
          a_dipendente: string
          created_at?: string
          da_dipendente: string
          decisione_at?: string | null
          decisione_di?: string | null
          id?: string
          motivo?: string | null
          status?: Database["public"]["Enums"]["swap_status"]
          turno_id: string
          updated_at?: string
        }
        Update: {
          a_dipendente?: string
          created_at?: string
          da_dipendente?: string
          decisione_at?: string | null
          decisione_di?: string | null
          id?: string
          motivo?: string | null
          status?: Database["public"]["Enums"]["swap_status"]
          turno_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turno_swap_requests_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turni"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      is_membro_canale: {
        Args: { _canale: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "manager" | "dipendente"
      chat_canale_tipo: "generale" | "annunci" | "reparto" | "privato"
      disponibilita_tipo: "disponibile" | "non_disponibile" | "preferito"
      pausa_tipo: "pranzo" | "caffe" | "altro"
      swap_status: "pending" | "approved" | "rejected" | "cancelled"
      tipo_turno: "mattina" | "pomeriggio" | "sera"
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
      app_role: ["manager", "dipendente"],
      chat_canale_tipo: ["generale", "annunci", "reparto", "privato"],
      disponibilita_tipo: ["disponibile", "non_disponibile", "preferito"],
      pausa_tipo: ["pranzo", "caffe", "altro"],
      swap_status: ["pending", "approved", "rejected", "cancelled"],
      tipo_turno: ["mattina", "pomeriggio", "sera"],
    },
  },
} as const
