import { ClientRecord, ClientStatus } from '../types';

const CITIES = [
  { name: 'AGUDOS', uf: 'SP', pop: 37401 },
  { name: 'AREALVA', uf: 'SP', pop: 8613 },
  { name: 'BAURU', uf: 'SP', pop: 379297 },
  { name: 'BOTUCATU', uf: 'SP', pop: 148130 },
  { name: 'BARIRI', uf: 'SP', pop: 35558 },
  { name: 'JAU', uf: 'SP', pop: 151881 },
  { name: 'LENCOIS PAULISTA', uf: 'SP', pop: 68990 },
  { name: 'PEDERNEIRAS', uf: 'SP', pop: 47111 },
  { name: 'PIRATININGA', uf: 'SP', pop: 13765 },
  { name: 'MARILIA', uf: 'SP', pop: 240590 },
];

const REP_SUPERVISOR_MAP: Record<string, string> = {
  'DINA': 'SUPERVISAO INTERIOR',
  'FABIANA': 'SUPERVISAO INTERIOR',
  'MAIANE PONTES': 'SUPERVISAO INTERIOR',
  'PAOLA CAMACHO': 'SUPERVISAO CAPITAL',
  'PAULO RODRIGO': 'SUPERVISAO CAPITAL',
  'PEDRO HENRIQUE': 'SUPERVISAO CAPITAL',
  'ROSI SILVA': 'SUPERVISAO OESTE',
  'TIAGO NUNES': 'SUPERVISAO OESTE',
  'WILSON LUIZ': 'SUPERVISAO OESTE'
};

const REPS = Object.keys(REP_SUPERVISOR_MAP);

const ACTIVITIES = ['SUPERMERCADO', 'VAREJAO', 'MERCEARIA', 'BAZAR', 'LOJA 1,99'];
const NEIGHBORHOODS = ['CENTRO', 'VILA NOVA', 'JD AMERICA', 'BELA VISTA', 'INDUSTRIAL'];

export const generateMockData = (): ClientRecord[] => {
  const data: ClientRecord[] = [];
  
  // Generate 500 random records
  for (let i = 0; i < 500; i++) {
    const cityObj = CITIES[Math.floor(Math.random() * CITIES.length)];
    const rep = REPS[Math.floor(Math.random() * REPS.length)];
    const supervisor = REP_SUPERVISOR_MAP[rep];
    const act = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
    const hood = NEIGHBORHOODS[Math.floor(Math.random() * NEIGHBORHOODS.length)];
    
    // Weighted random status
    const rand = Math.random();
    let status = ClientStatus.ACTIVE;
    if (rand > 0.6) status = ClientStatus.SEMI_ACTIVE;
    if (rand > 0.8) status = ClientStatus.INACTIVE;

    // Random dates
    const today = new Date();
    const lastPurchase = new Date();
    const daysAgo = Math.floor(Math.random() * 700);
    lastPurchase.setDate(today.getDate() - daysAgo);

    const registerDate = new Date();
    registerDate.setFullYear(2010 + Math.floor(Math.random() * 10));
    
    data.push({
      id: (4000 + i).toString(),
      socialName: `CLIENTE TESTE ${i} LTDA`,
      fantasyName: `MERCADO ${i}`,
      cnpj: `00.000.000/000${i}-00`,
      ie: `123.${i}.456`,
      city: cityObj.name,
      state: cityObj.uf,
      address: `RUA EXEMPLO, ${100 + i}`,
      neighborhood: hood,
      cep: '17000-000',
      activity: act,
      group: 'GERAL',
      lastPurchaseDate: lastPurchase.toISOString().split('T')[0],
      daysSincePurchase: daysAgo,
      registerDate: registerDate.toISOString().split('T')[0],
      representativeName: rep,
      rep3: rep, // For mock data, rep3 is same as main rep
      supervisor: supervisor,
      population: cityObj.pop,
      status: status
    });
  }
  return data;
};

export const MOCK_DATA = generateMockData();