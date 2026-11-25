import { createClient } from '@supabase/supabase-js';

// Conexão Master v5 blindada (Ignora variáveis desatualizadas da Vercel)
const SUPABASE_URL = 'https://acvpejgyqondqwsjbwaa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface ClientQueryFilters {
  search?: string;
  status?: string;
  abc?: string;
  representative?: string;
  supervisor?: string;
  city?: string;
  state?: string;
  minDays?: number;
  maxDays?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const cleanName = (name: any) => {
  if (name === null || name === undefined || String(name).toLowerCase() === 'null') return '';
  return String(name).replace(/^[\d./\s-]{5,}\s+/, '').trim();
};

export async function fetchClientsFromDb(filters: ClientQueryFilters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  
  let query = supabase
    .from('base_oficial_millenium')
    .select('*', { count: 'exact' });

  // Filtros
  if (filters.status) {
    query = query.ilike('status', `%${filters.status.trim()}%`);
  }
  if (filters.supervisor) {
    query = query.ilike('supervisor', `%${filters.supervisor.trim()}%`);
  }
  if (filters.representative) {
    query = query.ilike('representativeName', `%${filters.representative.trim()}%`);
  }
  if (filters.city) {
    query = query.ilike('city', `%${filters.city.trim()}%`);
  }
  if (filters.state) {
    query = query.ilike('state', `%${filters.state.trim()}%`);
  }
  if (filters.minDays !== undefined && !isNaN(Number(filters.minDays))) {
    query = query.gte('daysSincePurchase', Number(filters.minDays));
  }
  if (filters.maxDays !== undefined && !isNaN(Number(filters.maxDays))) {
    query = query.lte('daysSincePurchase', Number(filters.maxDays));
  }
  if (filters.search) {
    const s = filters.search.trim();
    query = query.or(`"Razão Social / Nome".ilike.%${s}%,Fantasia.ilike.%${s}%,cnpj.ilike.%${s}%,Código.ilike.%${s}%`);
  }

  // Ordenação
  const sortCol = filters.sortBy || 'daysSincePurchase';
  const ascending = filters.sortOrder === 'asc';
  query = query.order(sortCol, { ascending });

  // Paginação
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  const mapped = (data || []).map((r: any) => {
    const rawSocial = cleanName(r['Razão Social / Nome'] || r['Razao Social'] || r.socialName || '');
    const rawFantasy = cleanName(r['Fantasia'] || r['Nome Fantasia'] || r.fantasyName || '');
    const days = Number(r.daysSincePurchase) || 0;
    const abc = days <= 30 ? 'A' : (days <= 90 ? 'B' : 'C');

    return {
      codigo: String(r['Código'] || r.id || ''),
      razaoSocial: rawSocial || rawFantasy || 'NOME NÃO INFORMADO',
      nomeFantasia: rawFantasy || rawSocial || 'NOME NÃO INFORMADO',
      cnpj: r.cnpj || '',
      cidade: r.city || '',
      estado: r.state || '',
      bairro: r.neighborhood || '',
      ramoAtividade: r.activity || '',
      grupo: r.group || '',
      representante: r.representativeName || '',
      rep3: r.rep3 || '',
      supervisor: r.supervisor || '',
      status: r.status || 'Inativo',
      curvaAbc: abc,
      diasSemComprar: days,
      dataUltimaCompra: r.lastPurchaseDate || '',
      dataCadastro: r.registerDate || ''
    };
  });

  // Se filtrado por ABC em memória se necessário
  let result = mapped;
  if (filters.abc) {
    const upperAbc = filters.abc.toUpperCase();
    result = result.filter(c => c.curvaAbc === upperAbc);
  }

  return {
    total: count || 0,
    retornados: result.length,
    offset,
    limite: limit,
    clientes: result
  };
}

export async function fetchSummaryFromDb() {
  const { data, count, error } = await supabase
    .from('base_oficial_millenium')
    .select('status, daysSincePurchase, supervisor, representativeName, city, state', { count: 'exact' });

  if (error) throw error;

  const total = count || (data ? data.length : 0);
  let ativos = 0;
  let semiAtivos = 0;
  let inativos = 0;
  let curvaA = 0;
  let curvaB = 0;
  let curvaC = 0;

  const supervisoresMap: Record<string, { total: number; ativos: number; inativos: number }> = {};
  const representantesSet = new Set<string>();
  const cidadesSet = new Set<string>();

  (data || []).forEach((row: any) => {
    const status = (row.status || '').toLowerCase();
    if (status.includes('semi')) {
      semiAtivos++;
    } else if (status.includes('ativo')) {
      ativos++;
    } else {
      inativos++;
    }

    const days = Number(row.daysSincePurchase) || 0;
    if (days <= 30) curvaA++;
    else if (days <= 90) curvaB++;
    else curvaC++;

    const rep = row.representativeName?.trim();
    if (rep) representantesSet.add(rep);

    const city = row.city?.trim();
    if (city) cidadesSet.add(city);

    const sup = row.supervisor?.trim() || 'Não Definido';
    if (!supervisoresMap[sup]) {
      supervisoresMap[sup] = { total: 0, ativos: 0, inativos: 0 };
    }
    supervisoresMap[sup].total++;
    if (status.includes('ativo') && !status.includes('semi')) supervisoresMap[sup].ativos++;
    if (!status.includes('ativo')) supervisoresMap[sup].inativos++;
  });

  return {
    totalGeralClientes: total,
    resumoStatus: {
      ativos,
      semiAtivos,
      inativos,
      percentualAtivos: total > 0 ? Number(((ativos / total) * 100).toFixed(1)) : 0,
      percentualInativos: total > 0 ? Number(((inativos / total) * 100).toFixed(1)) : 0
    },
    resumoCurvaAbc: {
      curvaA_ate30dias: curvaA,
      curvaB_31a90dias: curvaB,
      curvaC_mais90dias: curvaC
    },
    metricasGerais: {
      totalRepresentantes: representantesSet.size,
      totalCidades: cidadesSet.size,
      totalSetoresSupervisao: Object.keys(supervisoresMap).length
    },
    setoresSupervisao: supervisoresMap
  };
}

export async function fetchRepresentativesAggregated() {
  const { data, error } = await supabase
    .from('base_oficial_millenium')
    .select('representativeName, status, daysSincePurchase, city');

  if (error) throw error;

  const repsMap: Record<string, {
    nome: string;
    totalClientes: number;
    ativos: number;
    semiAtivos: number;
    inativos: number;
    curvaA: number;
    curvaB: number;
    curvaC: number;
    cidadesAtendidas: Set<string>;
  }> = {};

  (data || []).forEach((row: any) => {
    const rep = row.representativeName?.trim() || 'Indefinido';
    if (!repsMap[rep]) {
      repsMap[rep] = {
        nome: rep,
        totalClientes: 0,
        ativos: 0,
        semiAtivos: 0,
        inativos: 0,
        curvaA: 0,
        curvaB: 0,
        curvaC: 0,
        cidadesAtendidas: new Set()
      };
    }

    const r = repsMap[rep];
    r.totalClientes++;

    const status = (row.status || '').toLowerCase();
    if (status.includes('semi')) r.semiAtivos++;
    else if (status.includes('ativo')) r.ativos++;
    else r.inativos++;

    const days = Number(row.daysSincePurchase) || 0;
    if (days <= 30) r.curvaA++;
    else if (days <= 90) r.curvaB++;
    else r.curvaC++;

    if (row.city) r.cidadesAtendidas.add(row.city.trim());
  });

  return Object.values(repsMap).map(r => ({
    nome: r.nome,
    totalClientes: r.totalClientes,
    ativos: r.ativos,
    semiAtivos: r.semiAtivos,
    inativos: r.inativos,
    curvaA: r.curvaA,
    curvaB: r.curvaB,
    curvaC: r.curvaC,
    quantidadeCidades: r.cidadesAtendidas.size
  })).sort((a, b) => b.totalClientes - a.totalClientes);
}

export async function fetchCitiesAggregated() {
  const { data, error } = await supabase
    .from('base_oficial_millenium')
    .select('city, state, status, daysSincePurchase, representativeName');

  if (error) throw error;

  const citiesMap: Record<string, {
    cidade: string;
    estado: string;
    totalClientes: number;
    ativos: number;
    semiAtivos: number;
    inativos: number;
    curvaA: number;
    curvaB: number;
    curvaC: number;
    representantes: Set<string>;
  }> = {};

  (data || []).forEach((row: any) => {
    const city = row.city?.trim() || 'Indefinido';
    const state = row.state?.trim() || 'UF';
    const key = `${city}-${state}`;

    if (!citiesMap[key]) {
      citiesMap[key] = {
        cidade: city,
        estado: state,
        totalClientes: 0,
        ativos: 0,
        semiAtivos: 0,
        inativos: 0,
        curvaA: 0,
        curvaB: 0,
        curvaC: 0,
        representantes: new Set()
      };
    }

    const c = citiesMap[key];
    c.totalClientes++;

    const status = (row.status || '').toLowerCase();
    if (status.includes('semi')) c.semiAtivos++;
    else if (status.includes('ativo')) c.ativos++;
    else c.inativos++;

    const days = Number(row.daysSincePurchase) || 0;
    if (days <= 30) c.curvaA++;
    else if (days <= 90) c.curvaB++;
    else c.curvaC++;

    if (row.representativeName) c.representantes.add(row.representativeName.trim());
  });

  return Object.values(citiesMap).map(c => ({
    cidade: c.cidade,
    estado: c.estado,
    totalClientes: c.totalClientes,
    ativos: c.ativos,
    semiAtivos: c.semiAtivos,
    inativos: c.inativos,
    curvaA: c.curvaA,
    curvaB: c.curvaB,
    curvaC: c.curvaC,
    representantes: Array.from(c.representantes)
  })).sort((a, b) => b.totalClientes - a.totalClientes);
}
