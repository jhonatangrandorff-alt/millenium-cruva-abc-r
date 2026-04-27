
import React, { useState, useRef, useEffect, useMemo } from 'react';
import RepresentativeTab from './components/RepresentativeTab';
import CityTab from './components/CityTab';
import SupervisorTab from './components/SupervisorTab';
import ClientListModal from './components/ClientListModal';
import Login from './components/Login';
import AdminSettingsModal from './components/AdminSettingsModal';
import { MOCK_DATA } from './services/mockData';
import { dbService } from './services/database';
import { supabaseService, SupabaseConfig } from './services/supabaseService';
import { ClientRecord, ClientStatus, UserAccount } from './types';

type Tab = 'representative' | 'city' | 'supervisor';
type DataSource = 'MOCK' | 'LOCAL_DB' | 'SUPABASE';

const TAB_STORAGE_KEY = 'MILLENIUM_PREF_ACTIVE_TAB';
const USER_SECTORS_KEY = 'MILLENIUM_USER_SECTORS';
const USER_NAME_KEY = 'MILLENIUM_USER_NAME';
const USER_ACCOUNTS_KEY = 'MILLENIUM_USER_ACCOUNTS';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return (localStorage.getItem(TAB_STORAGE_KEY) as Tab) || 'representative';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Processando...');
  const [clientData, setClientData] = useState<ClientRecord[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('MOCK');
  const [userSectors, setUserSectors] = useState<string[] | null>(() => {
    const saved = sessionStorage.getItem(USER_SECTORS_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return sessionStorage.getItem(USER_NAME_KEY);
  });

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(USER_ACCOUNTS_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Migration for old accounts that had 'sector' instead of 'sectors'
      return parsed.map((acc: any) => {
        if (!acc.sectors && acc.sector) {
          return {
            ...acc,
            sectors: [acc.sector]
          };
        }
        return {
          ...acc,
          sectors: acc.sectors || ['GERAL']
        };
      });
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await supabaseService.fetchUsers();
        if (users && users.length > 0) {
          setUserAccounts(users);
          localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(users));

          // Ensure the currently logged-in user's permissions are fully up-to-date
          if (userName && userName !== 'geral') {
            const activeDbUser = users.find(u => u.username === userName);
            if (activeDbUser && JSON.stringify(activeDbUser.sectors) !== JSON.stringify(userSectors)) {
              setUserSectors(activeDbUser.sectors);
              sessionStorage.setItem(USER_SECTORS_KEY, JSON.stringify(activeDbUser.sectors));
            } else if (!activeDbUser) {
              // Optionally log out if the user was deleted globally
              setUserSectors(null);
              setUserName(null);
              sessionStorage.removeItem(USER_SECTORS_KEY);
              sessionStorage.removeItem(USER_NAME_KEY);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar usuários da nuvem:", err);
      }
    };
    loadUsers();
  }, []);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isDataSaved, setIsDataSaved] = useState(true);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDataSaved) {
        const msg = "Você tem alterações não gravadas na nuvem! Deseja realmente sair?";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDataSaved]);

  // Removido o carregamento de chaves do localStorage para forçar o uso da conexão Master v5
  // Blindagem de conexão ativada


  const [sbConfig] = useState<SupabaseConfig>(() => ({ url: '', key: '' }));

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadingMsg('Sincronizando com a Nuvem Master (34k+ registros)...');
      try {
        const cloudData = await supabaseService.fetchClients(undefined, (current, total) => {
          setLoadingMsg(`Sincronizando: ${current.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} registros...`);
        });
        if (cloudData && cloudData.length > 0) {
          setClientData(cloudData);
          setDataSource('SUPABASE');
          await dbService.saveClients(cloudData);
          setIsLoading(false);
          return;
        }

        // Se chegar aqui, a nuvem está vazia. Verificamos o banco local.
        const dbData = await dbService.getAllClients();
        if (dbData && dbData.length > 0) {
          setClientData(dbData);
          setDataSource('LOCAL_DB');
        } else {
          // Se for a primeira vez e não houver nada, mostramos o Mock apenas para não ficar em branco
          setClientData(MOCK_DATA);
          setDataSource('MOCK');
        }
      } catch (error: any) {
        console.error("Erro crítico de carregamento:", error);
        // Tenta recuperar do banco local (IndexedDB)
        const dbData = await dbService.getAllClients();
        if (dbData && dbData.length > 0) {
          setClientData(dbData);
          setDataSource('LOCAL_DB');
          alert("Aviso: Exibindo dados salvos em cache (Modo Offline). A conexão com a nuvem falhou.");
        } else {
           setClientData(MOCK_DATA);
           setDataSource('MOCK');
           alert(`Falha total na conexão: ${error.message}. Verifique sua internet.`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const handleLogin = (sectors: string[], username: string) => {
    sessionStorage.setItem(USER_SECTORS_KEY, JSON.stringify(sectors));
    sessionStorage.setItem(USER_NAME_KEY, username);
    setUserSectors(sectors);
    setUserName(username);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(USER_SECTORS_KEY);
    sessionStorage.removeItem(USER_NAME_KEY);
    setUserSectors(null);
    setUserName(null);
  };

  const filteredData = useMemo(() => {
    if (!userSectors || userSectors.includes('GERAL')) return clientData;
    return clientData.filter(c => userSectors.includes(c.supervisor));
  }, [clientData, userSectors]);

  const availableSupervisors = useMemo(() => {
    const sups = new Set<string>();
    clientData.forEach(c => {
      if (c.supervisor) sups.add(c.supervisor);
    });
    return Array.from(sups).sort();
  }, [clientData]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalClients, setModalClients] = useState<ClientRecord[]>([]);

  const handleDownloadTemplate = () => {
    const headers = [
      "Código", "Razão Social / Nome", "Nome Fantasia", "CNPJ", "I. E.",
      "Cidade", "UF", "Endereço (Logradouro)", "Número", "Bairro", "CEP",
      "Ramo de atividade", "Grupo", "Ult. Compra", "Dias", "Cadastro",
      "Representante Padrão", "Situação do Cliente", "rep 3", "Supervisor", "Habitantes"
    ];
    const exampleRow = ["215746", "L.F.B PRODUTOS DE LIMPEZA LTDA", "BRILHANTE SOLUÇÕES", "58.531.529/0001-11", "194.279.910.119", "AVARE", "SP", "R DONA CARMEM DIAS FARIA", "2969", "ALTO", "18708-030", "LOJA", "GERAL", "15/12/2025", "51", "01/01/2024", "RAFAELA REIS", "Ativo", "RAFAELA REIS", "INTERIOR", "91232"];
    const csvContent = [headers.join(';'), exampleRow.join(';')].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_importacao_millenium.csv";
    link.click();
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(fieldName => {
        let val = row[fieldName] ?? '';
        val = String(val);
        if (val.includes('"') || val.includes(';')) val = `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const parseCSVLine = (line: string, delimiter: string) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    return parts;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMsg('Importando registros...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) { setIsLoading(false); return; }

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        // Detecção de delimitador inteligente
        const sample = lines.slice(0, 10).join('\n');
        const semicolonCount = (sample.match(/;/g) || []).length;
        const commaCount = (sample.match(/,/g) || []).length;
        const tabCount = (sample.match(/\t/g) || []).length;

        let delimiter = ';';
        if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';
        else if (commaCount > semicolonCount) delimiter = ',';

        // Identificação dinâmica do cabeçalho para evitar pular clientes
        let headerIndex = -1;
        let colMap: Record<string, number> = {};

        for (let i = 0; i < Math.min(lines.length, 30); i++) {
          const cols = parseCSVLine(lines[i], delimiter).map(c => c.trim().toLowerCase());
          if (cols.some(c => c === 'código' || c === 'codigo' || c === 'razão social' || c === 'razao social')) {
            headerIndex = i;
            cols.forEach((name, idx) => {
              if (name) colMap[name] = idx;
            });
            break;
          }
        }

        if (headerIndex === -1) {
          throw new Error("Não foi possível localizar o cabeçalho (Código/Razão Social) no arquivo.");
        }

        const getVal = (cols: string[], possibleNames: string[]) => {
          for (const name of possibleNames) {
            const idx = colMap[name.toLowerCase()];
            if (idx !== undefined && cols[idx] !== undefined) {
              return cols[idx].trim().replace(/^"|"$/g, '').trim();
            }
          }
          return '';
        };

        const newRecords: ClientRecord[] = lines.slice(headerIndex + 1).map((line) => {
          const cols = parseCSVLine(line, delimiter);
          if (cols.length < 3) return null;

          const rawId = getVal(cols, ['código', 'codigo', 'id', 'cod']);
          const name = getVal(cols, ['razão social / nome', 'razao social / nome', 'razão social', 'razao social', 'nome', 'social']);

          // Validação flexível: Se tem ID e não é uma linha de "Total" ou cabeçalho repetido
          if (!rawId || rawId.toLowerCase().includes('total') || rawId.toLowerCase() === 'código' || !name) {
            return null;
          }

          const rawStatus = getVal(cols, ['situação do cliente', 'situacao do cliente', 'situação', 'status', 'situacao']);
          let status = ClientStatus.ACTIVE;
          if (rawStatus.toLowerCase().includes('semi')) status = ClientStatus.SEMI_ACTIVE;
          else if (rawStatus.toLowerCase().includes('inativo')) status = ClientStatus.INACTIVE;

          const standardRep = getVal(cols, ['rep 3', 'rep3', 'representante padrão - copiar', 'representante padrão', 'representante', 'rep', 'vendedor']) || 'Indefinido';

          const parseDate = (d: string) => {
            if (!d) return new Date().toISOString().split('T')[0];
            const cleanD = d.trim().split(' ')[0];
            const parts = cleanD.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              return `${year}-${month}-${day}`;
            }
            return new Date().toISOString().split('T')[0];
          };

          const logradouro = getVal(cols, ['endereço (logradouro)', 'endereco', 'logradouro', 'rua', 'endereco (logradouro)']);
          const numero = getVal(cols, ['número', 'numero', 'nº']);

          const daysSincePurchase = parseInt(getVal(cols, ['dias']).replace(/\D/g, '') || '0', 10);
          
          // Curva ABC
          let abc: 'A' | 'B' | 'C' = 'C';
          if (daysSincePurchase <= 30) abc = 'A';
          else if (daysSincePurchase <= 90) abc = 'B';

          return {
            id: rawId,
            socialName: name,
            fantasyName: getVal(cols, ['nome fantasia', 'fantasia']),
            cnpj: getVal(cols, ['cnpj']),
            ie: getVal(cols, ['i. e.', 'ie']),
            city: getVal(cols, ['cidade']),
            state: getVal(cols, ['uf', 'estado']),
            address: numero ? `${logradouro}, ${numero}` : logradouro,
            neighborhood: getVal(cols, ['bairro']),
            cep: getVal(cols, ['cep']),
            activity: getVal(cols, ['ramo de atividade', 'ramo', 'atividade']),
            group: getVal(cols, ['grupo']),
            lastPurchaseDate: parseDate(getVal(cols, ['ult. compra', 'ultima compra', 'dt ult. compra'])),
            daysSincePurchase: daysSincePurchase,
            registerDate: parseDate(getVal(cols, ['cadastro', 'dt. cadastro'])),
            representativeName: standardRep,
            rep3: getVal(cols, ['rep 3', 'rep3']) || standardRep,
            supervisor: getVal(cols, ['supervisor', 'setor', 'gerente']) || 'GERAL',
            population: parseInt(getVal(cols, ['habitantes', 'populacao']).replace(/\D/g, '') || '0', 10),
            status: status,
            abc: abc
          };
        }).filter(r => r !== null) as ClientRecord[];

        if (newRecords.length > 0) {
          await dbService.saveClients(newRecords);
          setClientData(newRecords);

          let cloudSyncSuccess = false;
          try {
            setLoadingMsg(`Enviando ${newRecords.length} registros para a Nuvem Master...`);
            setIsLoading(true);
            await supabaseService.saveClients(sbConfig, newRecords);
            setDataSource('SUPABASE');
            cloudSyncSuccess = true;
          } catch (e: any) {
            console.warn("Falha ao sincronizar nuvem, usando apenas Local.", e);
            setDataSource('LOCAL_DB');
            alert(`Atenção: Os dados foram salvos LOCALMENTE, mas a Sincronização em Nuvem falhou:\n${e.message}`);
          } finally {
            setIsLoading(false);
            if (cloudSyncSuccess) setIsDataSaved(true);
            else setIsDataSaved(false);
          }

          if (cloudSyncSuccess) {
            alert(`SUCESSO GLOBAL: ${newRecords.length} clientes sincronizados na NUVEM. Agora todos os usuários verão estes dados ao atualizar a página.`);
          }
        } else {
          alert('Nenhum dado válido de cliente encontrado no arquivo.');
        }
      } catch (err: any) {
        alert('Erro: ' + err.message);
      } finally {
        setIsLoading(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (confirm("Deseja apagar todos os dados locais?")) {
      await dbService.clearDB();
      window.location.reload();
    }
  };

  const handleDrillDown = (filters: any) => {
    let filtered = filteredData;
    if (filters.rep) filtered = filtered.filter(c => c.rep3 === filters.rep);
    if (filters.city) filtered = filtered.filter(c => c.city === filters.city);
    if (filters.supervisor) filtered = filtered.filter(c => c.supervisor === filters.supervisor);
    if (filters.status) {
      if (Array.isArray(filters.status)) filtered = filtered.filter(c => (filters.status as any).includes(c.status));
      else filtered = filtered.filter(c => c.status === filters.status);
    }
    setModalTitle(`Detalhamento da Busca`);
    setModalClients(filtered);
    setModalOpen(true);
  };

  const handleManualSync = async () => {
    if (clientData.length === 0 || dataSource === 'MOCK') {
      alert("Nenhum dado real para gravar. Por favor, importe um arquivo primeiro.");
      return;
    }

    if (confirm(`Deseja gravar agora os ${clientData.length} registros permanentemente na Nuvem Master?`)) {
      setIsLoading(true);
      setLoadingMsg(`Gravando ${clientData.length} registros...`);
      try {
        await supabaseService.saveClients(sbConfig, clientData);
        setDataSource('SUPABASE');
        setIsDataSaved(true);
        alert("SUCESSO: Todos os dados foram gravados permanentemente na Nuvem!");
      } catch (e: any) {
        console.error("Erro no Sync Manual:", e);
        setIsDataSaved(false);
        alert(`FALHA NA GRAVAÇÃO: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!userSectors) {
    return (
      <>
        <Login
          userAccounts={userAccounts}
          onLogin={handleLogin}
          onOpenSettings={() => setShowAdminModal(true)}
        />
        <AdminSettingsModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          supervisors={availableSupervisors}
          userAccounts={userAccounts}
          onSave={(newAccounts) => {
            setUserAccounts(newAccounts);
            localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(newAccounts));
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <div className={`w-full py-1 text-center text-xs font-bold uppercase tracking-wider text-white flex justify-center items-center gap-4 ${dataSource === 'SUPABASE' ? 'bg-emerald-600' : (dataSource === 'LOCAL_DB' ? 'bg-blue-600' : 'bg-gray-500')}`}>
        <span className="flex items-center gap-1">
          <i className={`fas ${dataSource === 'SUPABASE' ? 'fa-cloud' : 'fa-database'} mr-2`}></i>
          {dataSource === 'SUPABASE' ? 'Modo Nuvem Master v5' : 'Modo Offline (Local)'}
          <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded ml-2 text-[9px] animate-pulse">NOVA BASE ATIVA</span>
        </span>
        <span className="bg-white/20 px-2 py-0.5 rounded flex items-center gap-2">
          <i className="fas fa-user text-[10px]"></i> {userName} ({userSectors?.includes('GERAL') ? 'GERAL' : userSectors?.join(', ')})
        </span>
        <button onClick={() => setShowAdminModal(true)} className="hover:text-yellow-400 transition-colors">
          <i className="fas fa-cog"></i> Config
        </button>
        <button onClick={handleLogout} className="hover:text-yellow-400 transition-colors">
          <i className="fas fa-sign-out-alt"></i> Sair
        </button>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mb-4"></div>
            <p className="text-blue-900 font-bold">{loadingMsg}</p>
          </div>
        </div>
      )}

      <AdminSettingsModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        supervisors={availableSupervisors}
        userAccounts={userAccounts}
        onSave={(newAccounts) => {
          setUserAccounts(newAccounts);
          localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(newAccounts));
        }}
      />


      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <i className="fas fa-chart-line text-yellow-400"></i> Millenium
              </h1>
              <div className="flex flex-wrap justify-center gap-3 items-center">
                <button onClick={handleDownloadTemplate} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors">
                  <i className="fas fa-download mr-2"></i> Modelo CSV
                </button>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-5 py-2 rounded-lg text-sm font-bold flex items-center shadow-lg transform active:scale-95 transition-all">
                  <i className="fas fa-file-import mr-2"></i> Importar Relatório
                </button>
                {clientData.length > 0 && (
                  <div className="flex items-center gap-2">
                    {!isDataSaved && (
                      <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded-full animate-pulse font-black shadow-lg">
                        ⚠️ DADOS PENDENTES
                      </span>
                    )}
                    {isDataSaved && (
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-full font-black shadow-lg">
                        ✅ SINCRONIZADO
                      </span>
                    )}
                    <button 
                      onClick={handleManualSync} 
                      className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center shadow-lg transform active:scale-95 transition-all border-2 border-white/20 ${isDataSaved ? 'bg-emerald-600 opacity-50 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-white animate-bounce-subtle'}`}
                      disabled={isDataSaved}
                    >
                      <i className={`fas ${isDataSaved ? 'fa-check-circle' : 'fa-sync-alt'} mr-2 ${!isDataSaved ? 'animate-spin-slow' : ''}`}></i> 
                      {isDataSaved ? 'GRAVADO COM SUCESSO' : 'CICLAR E SALVAR AGORA'}
                    </button>
                  </div>
                )}
                <button onClick={handleResetData} title="Limpar Banco de Dados" className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center border border-red-500 hover:bg-red-500 transition-colors"><i className="fas fa-trash text-white"></i></button>
              </div>
            </div>
          </div>

          <div className="flex border-b border-blue-100 bg-blue-50/50 p-2 gap-2">
            {['representative', 'city', 'supervisor'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as Tab)} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-700' : 'bg-transparent text-blue-600 hover:bg-blue-100 hover:text-blue-800'}`}>
                {tab === 'representative' ? 'Por Representante' : tab === 'city' ? 'Por Cidade' : 'Por Supervisor'}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8 min-h-[500px] bg-white">
            {activeTab === 'representative' ? <RepresentativeTab data={filteredData} onExport={exportToCSV} onDrillDown={handleDrillDown} /> : activeTab === 'city' ? <CityTab data={filteredData} onExport={exportToCSV} onDrillDown={handleDrillDown} /> : <SupervisorTab data={filteredData} onExport={exportToCSV} onDrillDown={handleDrillDown} />}
          </div>
        </div>
      </div>
      <ClientListModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} clients={modalClients} />
    </div>
  );
};

export default App;
