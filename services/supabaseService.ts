
import { createClient } from '@supabase/supabase-js';
import { ClientRecord, UserAccount } from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Inicializar cliente Global com chaves de produção (Blindagem de Conexão)
// INICIALIZAÇÃO FORÇADA (Ignora variáveis da Vercel para garantir conexão Master v5)
const globalUrl = 'https://acvpejgyqondqwsjbwaa.supabase.co';
const globalKey = 'sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J';

export let supabase = createClient(globalUrl, globalKey);

// Campos que existem na tabela 'base_oficial_millenium' do Supabase para evitar erro de coluna inexistente
const VALID_CLIENT_COLUMNS = [
  'id', 'socialName', 'fantasyName', 'cnpj', 'ie', 'city', 'state', 
  'address', 'neighborhood', 'cep', 'activity', 'group', 
  'lastPurchaseDate', 'daysSincePurchase', 'registerDate', 
  'representativeName', 'rep3', 'supervisor', 'population', 'status' // 'abc' removido temporariamente para evitar erro de coluna
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
  updateConfig: (url: string, key: string) => {
    if (url && key) {
      supabase = createClient(url, key);
    }
  },

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
                const records = (data as any[])
                  .filter(r => r['Código'] || r.id) // Remove linhas vazias corrompidas do CSV
                  .map(r => {
                  // Mapeamento das colunas customizadas do banco de dados do cliente
                  const mappedId = String(r['Código'] || r.id);
                  const mappedSocialName = String(r['Razão Social / Nome'] || r.socialName || 'NOME NAO INFORMADO');
                  const mappedFantasyName = String(r['Fantasia'] || r['Nome Fantasia'] || r.fantasyName || '');
                  
                  const days = r.daysSincePurchase || 0;
                  const calculatedAbc = days <= 30 ? 'A' : (days <= 90 ? 'B' : 'C');
                  
                  return {
                    ...r,
                    id: mappedId,
                    socialName: mappedSocialName,
                    fantasyName: mappedFantasyName,
                    abc: calculatedAbc
                  } as ClientRecord;
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
    const CONCURRENCY = 3; 
    
    try {
      const chunks = [];
      for (let i = 0; i < base_oficial_millenium.length; i += BATCH_SIZE) {
        const chunk = base_oficial_millenium.slice(i, i + BATCH_SIZE).map(c => {
          // Remover abc e fantasyName que não existem na tabela
          const { abc, fantasyName, id, socialName, ...rest } = c;
          // Mapear de volta para as colunas customizadas do banco
          return {
            ...rest,
            'Código': id,
            'Razão Social / Nome': socialName
          };
        });
        chunks.push(chunk);
      }

      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (chunk) => {
          const ids = chunk.map(c => c['Código']);
          // Delete manual por falta de Primary Key no banco do cliente
          await client.from('base_oficial_millenium').delete().in('Código', ids);
          
          const { error } = await client.from('base_oficial_millenium').insert(chunk);
          if (error) throw error;
        }));
        
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
