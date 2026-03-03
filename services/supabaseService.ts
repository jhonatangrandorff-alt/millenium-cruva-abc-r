
import { ClientRecord } from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export const supabaseService = {
  // Busca todos os clientes do Supabase
  fetchClients: async (config: SupabaseConfig): Promise<ClientRecord[]> => {
    if (!config.url || !config.key) return [];
    
    const url = `${config.url}/rest/v1/clients?select=*`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': config.key,
          'Authorization': `Bearer ${config.key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar dados do Supabase');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro Supabase Fetch:', error);
      throw error;
    }
  },

  // Salva (Upsert) múltiplos clientes no Supabase
  saveClients: async (config: SupabaseConfig, clients: ClientRecord[]): Promise<void> => {
    if (!config.url || !config.key) return;

    const url = `${config.url}/rest/v1/clients`;

    try {
      // Upsert: insere novos ou atualiza existentes baseados na Primary Key 'id'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': config.key,
          'Authorization': `Bearer ${config.key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(clients)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao salvar no Supabase');
      }
    } catch (error) {
      console.error('Erro Supabase Save:', error);
      throw error;
    }
  }
};
