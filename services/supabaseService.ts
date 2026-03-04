
import { createClient } from '@supabase/supabase-js';
import { ClientRecord } from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Inicializar cliente Global caso as variáveis existam
const globalUrl = import.meta.env.VITE_SUPABASE_URL || '';
const globalKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = globalUrl && globalKey
  ? createClient(globalUrl, globalKey)
  : null;

export const supabaseService = {
  // Busca todos os clientes do Supabase
  fetchClients: async (config?: SupabaseConfig): Promise<ClientRecord[]> => {
    // Tenta usar o cliente global primeiro, senão usa o `config` (caso exista)
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);

    if (!client) {
      console.warn('Supabase não configurado. Fallback para banco local será ativado.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('clients')
        .select('*');

      if (error) {
        throw new Error(error.message);
      }

      return data as ClientRecord[];
    } catch (error) {
      console.error('Erro Supabase Fetch:', error);
      throw error;
    }
  },

  // Salva (Upsert) múltiplos clientes no Supabase
  saveClients: async (config: SupabaseConfig | null, clients: ClientRecord[]): Promise<void> => {
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);

    if (!client) return;

    try {
      const { error } = await client
        .from('clients')
        .upsert(clients, { onConflict: 'id' });

      if (error) {
        throw new Error(error.message || 'Erro ao salvar no Supabase');
      }
    } catch (error) {
      console.error('Erro Supabase Save:', error);
      throw error;
    }
  }
};
