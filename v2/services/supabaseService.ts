
import { createClient } from '@supabase/supabase-js';
import { ClientRecord, UserAccount } from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Inicializar cliente Global com chaves de produção (Blindagem de Conexão Master v5)
const globalUrl = import.meta.env.VITE_SUPABASE_URL || 'https://acvpejgyqondqwsjbwaa.supabase.co';
const globalKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J';

export const supabase = createClient(globalUrl, globalKey);

// Campos que existem na tabela 'base_oficial_millenium' do Supabase para evitar erro de coluna inexistente
const VALID_CLIENT_COLUMNS = [
  'Código', 'Razão Social / Nome', 'Nome Fantasia', 'Fantasia', 'cnpj', 'ie', 'city', 'state', 
  'address', 'neighborhood', 'cep', 'activity', 'group', 
  'lastPurchaseDate', 'daysSincePurchase', 'registerDate', 
  'representativeName', 'rep3', 'supervisor', 'population', 'status'
];

const sanitizeClient = (client: any) => {
  const sanitized: any = {};
  VALID_CLIENT_COLUMNS.forEach(col => {
    if (client[col] !== undefined) {
      sanitized[col] = client[col];
    }
  });

  // Garantir que a Razão Social nunca seja null para evitar erro de constraint no banco
  if (!sanitized['Razão Social / Nome']) {
    sanitized['Razão Social / Nome'] = sanitized['Nome Fantasia'] || sanitized['Fantasia'] || sanitized['Código'] || 'NOME NAO INFORMADO';
  }

  return sanitized;
};

const cleanName = (name: any) => {
  if (name === null || name === undefined || String(name).toLowerCase() === 'null') return '';
  return String(name).replace(/^[\d./\s-]{5,}\s+/, '').trim();
};

export const supabaseService = {
  // Busca todos os clientes do Supabase
  fetchClients: async (config?: SupabaseConfig, onProgress?: (current: number, total: number) => void): Promise<ClientRecord[]> => {
    // CORREÇÃO: Priorizar config passada (URL fornecida no modal) sobre o cliente global
    const client = (config?.url && config?.key) 
      ? createClient(config.url, config.key) 
      : supabase;

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
                  if (!r) return null;
                  // Mapeamento robusto para Razão Social e Fantasia (Suporte a nomes curtos e variações)
                  const rawSocial = cleanName(r['Razão Social / Nome'] || r['Razao Social'] || r['Razão Soc'] || r['Razao Soc'] || r.socialName || r['social_name'] || '');
                  const rawFantasy = cleanName(r['Nome Fantasia'] || r['Fantasia'] || r['Nome Far'] || r['Nome Fan'] || r.fantasyName || r['fantasy_name'] || '');

                  const mappedSocialName = rawSocial || rawFantasy || 'NOME NAO INFORMADO';
                  const mappedFantasyName = rawFantasy || rawSocial || 'NOME NAO INFORMADO';
                  
                  const days = r.daysSincePurchase || 0;
                  const calculatedAbc = days <= 30 ? 'A' : (days <= 90 ? 'B' : 'C');
                  
                  return {
                    ...r,
                    id: mappedId,
                    socialName: mappedSocialName,
                    fantasyName: mappedFantasyName,
                    abc: calculatedAbc
                  } as ClientRecord;
                }).filter(r => r !== null) as ClientRecord[];
                
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
    // CORREÇÃO: Priorizar config passada (URL fornecida no modal) sobre o cliente global
    const client = (config?.url && config?.key) 
      ? createClient(config.url, config.key) 
      : supabase;

    if (!client) {
      throw new Error("Não foi possível inicializar o cliente Supabase.");
    }

    // Otimização para grandes volumes (35k+)
    const BATCH_SIZE = 200;
    const CONCURRENCY = 3; 
    
    console.log(`Iniciando salvamento v2 de ${base_oficial_millenium.length} registros...`);

    try {
      // 0. Detectar colunas reais do banco para evitar crash (Fallback dinâmico)
      const { data: colSample, error: colError } = await client.from('base_oficial_millenium').select('*').limit(1);
      if (colError) console.warn('Aviso ao detectar colunas:', colError.message);

      const dbColumns = colSample && colSample.length > 0 ? Object.keys(colSample[0]) : [];
      
      // Procura qualquer variação de Fantasia que exista no banco
      const fantasiaCol = ['Nome Fantasia', 'Fantasia', 'fantasyName', 'fantasy_name'].find(v => dbColumns.includes(v));

      const chunks = [];
      for (let i = 0; i < base_oficial_millenium.length; i += BATCH_SIZE) {
        const chunk = base_oficial_millenium.slice(i, i + BATCH_SIZE).map(c => {
          const payload: any = {
            'Código': String(c.id),
            'Razão Social / Nome': String(c.socialName || c.id || 'NOME INDISPONÍVEL'),
            'cnpj': c.cnpj || '',
            'ie': c.ie || '',
            'city': c.city || '',
            'state': c.state || '',
            'address': c.address || '',
            'neighborhood': c.neighborhood || '',
            'cep': c.cep || '',
            'activity': c.activity || '',
            'group': c.group || '',
            'lastPurchaseDate': c.lastPurchaseDate,
            'daysSincePurchase': c.daysSincePurchase || 0,
            'registerDate': c.registerDate,
            'representativeName': c.representativeName || '',
            'rep3': c.rep3 || '',
            'supervisor': c.supervisor || '',
            'population': c.population || 0,
            'status': c.status || 'Ativo'
          };

          // Validar datas para evitar erro de formato no Postgres
          if (!payload['lastPurchaseDate'] || payload['lastPurchaseDate'] === '') delete payload['lastPurchaseDate'];
          if (!payload['registerDate'] || payload['registerDate'] === '') delete payload['registerDate'];
          
          if (fantasiaCol) {
            payload[fantasiaCol] = c.fantasyName || '';
          }
          
          return payload;
        });
        chunks.push(chunk);
      }

      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (chunk) => {
          const ids = chunk.map(c => c['Código']);
          
          // Delete manual por falta de Primary Key no banco do cliente
          const { error: delError } = await client.from('base_oficial_millenium').delete().in('Código', ids);
          if (delError) console.warn("Aviso no Delete v2:", delError.message);
          
          const { error } = await client.from('base_oficial_millenium').insert(chunk);
          if (error) {
             console.error("ERRO CRÍTICO NO INSERT SUPABASE v2:", error);
             throw new Error(`Erro na gravação (Lote ${i/BATCH_SIZE}): ${error.message} - Detalhes: ${error.details || 'sem detalhes'}`);
          }
        }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log("Salvamento v2 concluído com sucesso.");
    } catch (error: any) {
      console.error('Falha geral no salvamento Supabase v2:', error);
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
