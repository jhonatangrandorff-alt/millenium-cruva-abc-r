export enum ClientStatus {
  ACTIVE = 'Ativo',
  SEMI_ACTIVE = 'Semi-Ativo',
  INACTIVE = 'Inativo'
}

export interface ClientRecord {
  id: string; // Código
  socialName: string; // Razão Social / Nome
  fantasyName: string; // Nome Fantasia
  cnpj: string;
  ie: string;
  city: string;
  state: string;
  address: string; // Endereço + Numero
  neighborhood: string; // Bairro
  cep: string;
  activity: string; // Ramo de atividade
  group: string;
  lastPurchaseDate: string; // Ult. Compra
  daysSincePurchase: number; // Dias
  registerDate: string; // Cadastro
  representativeName: string; // Representante (standard Rep column)
  rep3: string; // Rep 3 (Specific column for filtering)
  supervisor: string; // Setor / Supervisor
  population: number;
  status: ClientStatus; // Situação do Cliente
}

export interface RepViewRow {
  city: string;
  state: string;
  active: number;
  semiActive: number;
  inactive: number;
  total: number;
  population: number;
}

export interface CityViewRow {
  representativeName: string;
  active: number;
  semiActive: number;
  inactive: number;
  total: number;
}

export interface SectorPassword {
  sector: string;
  password: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  sectors: string[];
}

