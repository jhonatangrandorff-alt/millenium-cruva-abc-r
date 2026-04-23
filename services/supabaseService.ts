
import { createClient } from '@supabase/supabase-js';
import { ClientRecord, UserAccount } from '../types';

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

// Campos que existem na tabela 'clients' do Supabase para evitar erro de coluna inexistente
const VALID_CLIENT_COLUMNS = [
  'id', 'socialName', 'fantasyName', 'cnpj', 'ie', 'city', 'state', 
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

  // Garantir que socialName nunca seja null para evitar erro de constraint no banco
  if (!sanitized.socialName) {
    sanitized.socialName = sanitized.fantasyName || sanitized.id || 'NOME NAO INFORMADO';
  }

  return sanitized;
};

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
      const step = 500;
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
          } else {
            // Pequena pausa para evitar timeout no banco em tabelas gigantes
            await new Promise(resolve => setTimeout(resolve, 50));
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

  // Salva (Upsert) múltiplos clientes no Supabase em lotes
  saveClients: async (config: SupabaseConfig | null, clients: ClientRecord[]): Promise<void> => {
    // Mesma lógica: Global primeiro
    const client = supabase || (config?.url && config?.key ? createClient(config.url, config.key) : null);

    if (!client) {
      const errorMsg = "Não foi possível inicializar o cliente Supabase. Verifique se as variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) estão configuradas corretamente.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Sanitiza os dados para enviar apenas colunas válidas
      const sanitizedClients = clients.map(sanitizeClient);

      // Processar em lotes para evitar erro de payload muito grande ou timeout
      // Reduzido para 200 para maior estabilidade em tabelas grandes
      const BATCH_SIZE = 200;
      for (let i = 0; i < sanitizedClients.length; i += BATCH_SIZE) {
        const batch = sanitizedClients.slice(i, i + BATCH_SIZE);
        
        const { error } = await client
          .from('clients')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          console.error(`Erro ao salvar lote (${i} a ${i + batch.length}):`, error);
          throw new Error(error.message || 'Erro ao salvar no Supabase');
        }

        // Pequeno intervalo para dar fôlego ao banco de dados em processamentos longos
        if (sanitizedClients.length > BATCH_SIZE) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
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
