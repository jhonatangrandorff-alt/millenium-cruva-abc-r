
import { createClient } from '@supabase/supabase-js';
import { ClientRecord, UserAccount } from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Inicializar cliente Global com chaves de produção (Blindagem de Conexão)
const globalUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ndlqdcccrimqktzxaozl.supabase.co';
const globalKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbHFkY2NjcmltcWt0enhhb3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDAyNDEsImV4cCI6MjA5MjYxNjI0MX0.QalzSGDFcV37jaZ5yx2qwb6YvNvCl7dBxk740NOwmzE';

export const supabase = createClient(globalUrl, globalKey);

// Campos que existem na tabela 'base_oficial_millenium' do Supabase para evitar erro de coluna inexistente
const VALID_CLIENT_COLUMNS = [
  'id', 'socialName', 'fantasyName', 'cnpj', 'ie', 'city', 'state', 
  'address', 'neighborhood', 'cep', 'activity', 'group', 
  'lastPurchaseDate', 'daysSincePurchase', 'registerDate', 
  'representativeName', 'rep3', 'supervisor', 'population', 'status', 'abc'
];

const sanitizeClient = (client: any) => {
  const sanitized: any = {};
  VALID_CLIENT_COLUMNS.forEach(col => {
    if (client[col] !== undefined) {
      sanitized[col] = client[col];
    }
  });

  // Garantir que socialName nunca seja null para evitar erro de constraint no banco
  if (!sanitized.socialName) {
    sanitized.socialName = sanitized.fantasyName || sanitized.id || 'NOME NAO INFORMADO';
  }

  return sanitized;
};

export const supabaseService = {
  // Busca todos os clientes do Supabase
  fetchClients: async (config?: SupabaseConfig, onProgress?: (current: number, total: number) => void): Promise<ClientRecord[]> => {
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);

    if (!client) {
      console.warn('⚠️ Supabase não configurado via variáveis de ambiente. Fallback inativo.');
      return [];
    }

    try {
      // 1. Obter o total de registros primeiro (muito rápido)
      const { count, error: countError } = await client
        .from('base_oficial_millenium')
        .select('*', { count: 'exact', head: true });

      if (countError) throw new Error(countError.message);
      
      const total = count || 0;
      if (total === 0) return [];

      const step = 1000; 
      const pages = Math.ceil(total / step);
      let allData: ClientRecord[] = [];
      let loadedCount = 0;
      
      // 2. Buscar páginas em paralelo com limite de concorrência
      const CONCURRENCY_LIMIT = 5;
      for (let i = 0; i < pages; i += CONCURRENCY_LIMIT) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + CONCURRENCY_LIMIT, pages); j++) {
          const start = j * step;
          const end = start + step - 1;
          batchPromises.push(
            client
              .from('base_oficial_millenium')
              .select('*')
              .range(start, end)
              .then(({ data, error }) => {
                if (error) throw error;
                const records = (data as any[]).map(r => {
                  // Fallback para calcular Curva ABC se não existir na coluna do banco
                  if (!r.abc) {
                    const days = r.daysSincePurchase || 0;
                    r.abc = days <= 30 ? 'A' : (days <= 90 ? 'B' : 'C');
                  }
                  return r as ClientRecord;
                });
                loadedCount += records.length;
                if (onProgress) onProgress(loadedCount, total);
                return records;
              })
          );
        }
        
        const results = await Promise.all(batchPromises);
        results.forEach(data => {
          allData = [...allData, ...data];
        });
      }

      return allData;
    } catch (error) {
      console.error('Erro Supabase Fetch:', error);
      throw error;
    }
  },

  saveClients: async (config: SupabaseConfig | null, base_oficial_millenium: ClientRecord[]): Promise<void> => {
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);

    if (!client) {
      throw new Error("Não foi possível inicializar o cliente Supabase.");
    }

    const BATCH_SIZE = 150;
    const CONCURRENCY = 3; // Envia 3 lotes simultâneos
    
    try {
      const chunks = [];
      for (let i = 0; i < base_oficial_millenium.length; i += BATCH_SIZE) {
        chunks.push(base_oficial_millenium.slice(i, i + BATCH_SIZE).map(sanitizeClient));
      }

      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(chunk => 
          client
            .from('base_oficial_millenium')
            .upsert(chunk, { onConflict: 'id' })
            .then(({ error }) => {
              if (error) throw error;
            })
        ));
        
        // Pequena pausa para estabilidade
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error: any) {
      console.error('Erro Supabase Save:', error);
      throw error;
    }
  },

  fetchUsers: async (config?: SupabaseConfig): Promise<UserAccount[]> => {
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);
    if (!client) {
      console.warn('⚠️ Supabase não configurado. Fallback inativo.');
      return [];
    }
    try {
      const { data, error } = await client
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as UserAccount[];
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  },

  saveUser: async (config: SupabaseConfig | null, user: UserAccount): Promise<void> => {
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);
    if (!client) return;
    try {
      const { error } = await client
        .from('users')
        .upsert(user, { onConflict: 'username' });

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      throw error;
    }
  },

  deleteUser: async (config: SupabaseConfig | null, id: string): Promise<void> => {
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);
    if (!client) return;
    try {
      const { error } = await client
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  }
};
