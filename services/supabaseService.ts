
import { createClient } from '@supabase/supabase-js';
import { ClientRecord } from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Inicializar cliente Global caso as variáveis existam
const globalUrl = import.meta.env.VITE_SUPABASE_URL || '';
const globalKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (import.meta.env.DEV) {
  console.log('[Supabase Diagnostic] VITE_SUPABASE_URL:', globalUrl ? 'DEFINIDA' : 'VAZIA');
  console.log('[Supabase Diagnostic] VITE_SUPABASE_ANON_KEY:', globalKey ? 'DEFINIDA' : 'VAZIA');
}

export const supabase = globalUrl && globalKey
  ? createClient(globalUrl, globalKey)
  : null;

export const supabaseService = {
  // Busca todos os clientes do Supabase
  fetchClients: async (config?: SupabaseConfig): Promise<ClientRecord[]> => {
    // A PRIORIDADE MÁXIMA É A INSTÂNCIA GLOBAL (VITE_ENV). Só usa o `config` se o env falhar.
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);

    if (!client) {
      console.warn('⚠️ Supabase não configurado via variáveis de ambiente. Fallback inativo.');
      return [];
    }

    try {
      let allData: ClientRecord[] = [];
      let start = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await client
          .from('clients')
          .select('*')
          .order('id', { ascending: true })
          .range(start, start + step - 1);

        if (error) {
          throw new Error(error.message);
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data as ClientRecord[]];
          start += step;
          if (data.length < step) {
            hasMore = false; // Última página
          }
        } else {
          hasMore = false;
        }
      }

      return allData;
    } catch (error) {
      console.error('Erro Supabase Fetch:', error);
      throw error;
    }
  },

  // Salva (Upsert) múltiplos clientes no Supabase
  saveClients: async (config: SupabaseConfig | null, clients: ClientRecord[]): Promise<void> => {
    // Mesma lógica: Global primeiro
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);

    if (!client) {
      console.error("Tentativa de salvar na Nuvem falhou pois o Cliente Supabase é Null. Variáveis de ambiente falharam.");
      return;
    }

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
