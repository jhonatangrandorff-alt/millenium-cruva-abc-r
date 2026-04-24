import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ClientRecord, RepViewRow, ClientStatus } from '../types';
import { useVirtualizer } from '../hooks/useVirtualizer';

interface RepresentativeTabProps {
  data: ClientRecord[];
  onExport: (data: any[], filename: string) => void;
  onDrillDown: (filters: { rep?: string; city?: string; status?: ClientStatus | ClientStatus[] }) => void;
}

const ITEM_HEIGHT = 56; // Estimated row height

// Persistence Keys
const KEY_REP_NAME = 'MILLENIUM_PREF_REP_NAME';
const KEY_DATE_START = 'MILLENIUM_PREF_DATE_START';
const KEY_DATE_END = 'MILLENIUM_PREF_DATE_END';

type SortKey = keyof RepViewRow;

const RepresentativeTab: React.FC<RepresentativeTabProps> = ({ data, onExport, onDrillDown }) => {
  // Initialize state from LocalStorage
  const [selectedRep, setSelectedRep] = useState<string>(() => localStorage.getItem(KEY_REP_NAME) || '');
  const [startDate, setStartDate] = useState(() => localStorage.getItem(KEY_DATE_START) || '2023-01-01');
  const [endDate, setEndDate] = useState(() => localStorage.getItem(KEY_DATE_END) || new Date().toISOString().split('T')[0]);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'positiveCount', // Default sort by count
    direction: 'desc'
  });

  // Persist changes
  useEffect(() => { localStorage.setItem(KEY_REP_NAME, selectedRep); }, [selectedRep]);
  useEffect(() => { localStorage.setItem(KEY_DATE_START, startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem(KEY_DATE_END, endDate); }, [endDate]);

  // Searchable Select States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(selectedRep); // Init search term with selected value
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync SearchTerm if selectedRep changes externally
  useEffect(() => {
    setSearchTerm(selectedRep);
  }, [selectedRep]);

  // Extract unique reps from rep3 column
  const representatives = useMemo(() => {
    const reps = Array.from(new Set(data.map(d => d.rep3))).sort();
    return reps;
  }, [data]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // If user typed something invalid and clicked out, revert to selectedRep
        // But if selectedRep is empty, allow searchTerm to remain whatever (or clear it? usually clear to match selection)
        if (!representatives.includes(searchTerm) && searchTerm !== '') {
           setSearchTerm(selectedRep);
        } else if (searchTerm === '') {
           setSearchTerm(selectedRep);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, selectedRep, searchTerm, representatives]);

  // Filtered Options for the Dropdown
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return representatives;
    return representatives.filter(r => 
      r.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [representatives, searchTerm]);

  const handleSelectRep = (rep: string) => {
    setSelectedRep(rep);
    setSearchTerm(rep);
    setIsDropdownOpen(false);
  };

  const handleClearFilters = () => {
    // Reset Dates to default
    setStartDate('2023-01-01');
    setEndDate(new Date().toISOString().split('T')[0]);

    // Clear Representative Selection (Make it blank)
    setSelectedRep('');
    setSearchTerm('');
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Filter and Aggregate Data
  const tableData = useMemo(() => {
    if (!selectedRep) return [];

    // 1. Filter by Rep3
    const filtered = data.filter(item => item.rep3 === selectedRep);

    // 2. Group by City
    const cityMap = new Map<string, RepViewRow>();

    filtered.forEach(item => {
      const key = `${item.city} - ${item.state}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, {
          city: item.city,
          state: item.state,
          active: 0,
          semiActive: 0,
          inactive: 0,
          a: 0,
          b: 0,
          c: 0,
          total: 0,
          population: item.population
        });
      }
      const entry = cityMap.get(key)!;
      
      if (item.status === ClientStatus.ACTIVE) entry.active++;
      else if (item.status === ClientStatus.SEMI_ACTIVE) entry.semiActive++;
      else if (item.status === ClientStatus.INACTIVE) entry.inactive++;
      
      if (item.abc === 'A') entry.a++;
      else if (item.abc === 'B') entry.b++;
      else if (item.abc === 'C') entry.c++;

      entry.total++;
    });

    const rows = Array.from(cityMap.values());

    // 3. Sort
    return rows.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, selectedRep, sortConfig]);

  const totals = tableData.reduce((acc, curr) => ({
    active: acc.active + curr.active,
    semi: acc.semi + curr.semiActive,
    inactive: acc.inactive + curr.inactive,
    a: acc.a + curr.a,
    b: acc.b + curr.b,
    c: acc.c + curr.c,
    total: acc.total + curr.total,
    pop: acc.pop + curr.population
  }), { active: 0, semi: 0, inactive: 0, a: 0, b: 0, c: 0, total: 0, pop: 0 });

  const handleExport = () => {
    const csvData = tableData.map(row => ({
      'Cidade/UF': `${row.city} - ${row.state}`,
      'Ativo': row.active,
      'Semi-ativo': row.semiActive,
      'Inativo': row.inactive,
      'Curva A': row.a,
      'Curva B': row.b,
      'Curva C': row.c,
      'Total': row.total,
      'Habitantes': row.population
    }));
    onExport(csvData, `Positivacao_${selectedRep}_${startDate}_${endDate}`);
  };

  // Virtualization
  const { virtualItems, paddingTop, paddingBottom } = useVirtualizer({
    count: tableData.length,
    itemHeight: ITEM_HEIGHT,
    containerRef: containerRef,
    overscan: 5
  });

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <i className="fas fa-sort text-gray-400 opacity-30 ml-2 text-xs"></i>;
    return sortConfig.direction === 'asc' 
      ? <i className="fas fa-sort-up text-blue-400 ml-2 text-xs"></i> 
      : <i className="fas fa-sort-down text-blue-400 ml-2 text-xs"></i>;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header / Filters */}
      <div className="bg-yellow-50 p-4 border border-yellow-200 shadow-sm rounded-2xl">
        
        <div className="flex flex-col lg:flex-row justify-between items-end gap-4 bg-white p-4 rounded-xl shadow-inner border border-yellow-100">
          
          {/* SEARCHABLE REPRESENTATIVE INPUT */}
          <div className="w-full lg:w-1/3 relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Selecione o Representante</label>
            <div className="relative group">
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onClick={() => setIsDropdownOpen(true)}
                placeholder="Digite para buscar..."
                className="w-full p-2.5 pl-3 pr-10 border border-gray-300 bg-gray-50 rounded-lg text-sm text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <div 
                className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer text-gray-500 hover:text-blue-600"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <i className={`fas fa-chevron-down text-xs transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}></i>
              </div>
            </div>

            {/* DROPDOWN LIST */}
            {isDropdownOpen && (
              <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in">
                {filteredOptions.length === 0 ? (
                  <li className="p-3 text-sm text-gray-400 text-center italic">Nenhum representante encontrado</li>
                ) : (
                  filteredOptions.map((rep) => (
                    <li 
                      key={rep}
                      onClick={() => handleSelectRep(rep)}
                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-none ${rep === selectedRep ? 'bg-blue-100 text-blue-900 font-bold' : 'text-gray-700'}`}
                    >
                      {rep}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end w-full lg:w-auto">
            <div className="flex flex-col w-full sm:w-auto">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Período</label>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                 <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-auto border border-gray-300 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="hidden sm:inline text-gray-400 font-bold">-</span>
                <span className="sm:hidden text-gray-400 font-bold text-xs my-1">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-auto border border-gray-300 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleClearFilters}
                className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-4 py-2.5 rounded-full text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all"
                title="Limpar Filtros (Nome e Datas)"
              >
                <i className="fas fa-eraser"></i>
              </button>
              
              <button 
                onClick={handleExport}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full text-sm font-bold flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <i className="fas fa-file-excel"></i> Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table - Virtualized */}
      <div 
        ref={containerRef}
        className="overflow-auto max-h-[600px] border border-gray-200 rounded-2xl shadow-lg relative"
      >
        <table className="w-full text-sm font-sans border-collapse">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
              <th 
                className="text-left p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none"
                onClick={() => handleSort('city')}
              >
                Cidades/UF {renderSortIcon('city')}
              </th>
              <th 
                className="text-center p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none bg-green-900/50"
                onClick={() => handleSort('active')}
              >
                Ativo {renderSortIcon('active')}
              </th>
              <th 
                className="text-center p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none bg-orange-900/50"
                onClick={() => handleSort('semiActive')}
              >
                Semi {renderSortIcon('semiActive')}
              </th>
              <th 
                className="text-center p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none bg-red-900/50"
                onClick={() => handleSort('inactive')}
              >
                Inativo {renderSortIcon('inactive')}
              </th>
              {/* ABC Columns */}
              <th 
                className="text-center p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none bg-emerald-900/40 border-l border-white/10"
                onClick={() => handleSort('a')}
              >
                A {renderSortIcon('a')}
              </th>
              <th 
                className="text-center p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none bg-blue-900/40"
                onClick={() => handleSort('b')}
              >
                B {renderSortIcon('b')}
              </th>
              <th 
                className="text-center p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none bg-amber-900/40"
                onClick={() => handleSort('c')}
              >
                C {renderSortIcon('c')}
              </th>

              <th 
                className="text-center p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none bg-blue-900/50 border-l border-white/10"
                onClick={() => handleSort('total')}
              >
                Total {renderSortIcon('total')}
              </th>
              <th 
                className="text-right p-4 font-semibold cursor-pointer hover:bg-white/10 transition-colors select-none"
                onClick={() => handleSort('population')}
              >
                Habitantes {renderSortIcon('population')}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0 text-center text-gray-400 bg-gray-50/50">
                  {!selectedRep ? (
                    <div className="p-12 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex flex-col items-center">
                          <span className="text-xs font-bold text-blue-400 uppercase mb-2">Total de Clientes</span>
                          <span className="text-4xl font-black text-blue-900">{data.length.toLocaleString('pt-BR')}</span>
                          <div className="mt-4 w-full h-1.5 bg-blue-50 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-600 w-full"></div>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-green-100 flex flex-col items-center">
                          <span className="text-xs font-bold text-green-400 uppercase mb-2">Representantes</span>
                          <span className="text-4xl font-black text-green-900">{representatives.length}</span>
                          <div className="mt-4 w-full h-1.5 bg-green-50 rounded-full overflow-hidden">
                             <div className="h-full bg-green-500 w-full"></div>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100 flex flex-col items-center">
                          <span className="text-xs font-bold text-purple-400 uppercase mb-2">Cidades</span>
                          <span className="text-4xl font-black text-purple-900">{new Set(data.map(d => d.city)).size}</span>
                          <div className="mt-4 w-full h-1.5 bg-purple-50 rounded-full overflow-hidden">
                             <div className="h-full bg-purple-500 w-full"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-bounce">
                           <i className="fas fa-search text-2xl text-blue-600"></i>
                        </div>
                        <p className="text-lg font-bold text-blue-900">
                          Base de Dados Pronta!
                        </p>
                        <p className="text-sm text-gray-500 max-w-sm">
                          Selecione um representante acima para detalhar o desempenho por cidade e situação.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-20 flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                         <i className="fas fa-users-slash text-2xl text-gray-300"></i>
                      </div>
                      <p className="text-base font-medium">
                        Nenhum dado encontrado para este representante específico.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr style={{ height: `${paddingTop}px` }}>
                    <td colSpan={3} />
                  </tr>
                )}
                {virtualItems.map((index) => {
                  const row = tableData[index];
                  return (
                    <tr key={index} className={`transition-colors border-b border-gray-100 h-[56px] box-border ${index % 2 === 0 ? "bg-white" : "bg-blue-50/30"} hover:bg-blue-50`}>
                      <td className="p-3 px-4 font-medium text-gray-800">
                        {row.city} - {row.state}
                      </td>
                      <td className="p-3 px-4 text-center">
                        {row.active > 0 ? (
                           <button onClick={() => onDrillDown({ rep: selectedRep, city: row.city, status: ClientStatus.ACTIVE })} className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold text-xs hover:bg-green-200">{row.active}</button>
                        ) : "-"}
                      </td>
                      <td className="p-3 px-4 text-center">
                        {row.semiActive > 0 ? (
                           <button onClick={() => onDrillDown({ rep: selectedRep, city: row.city, status: ClientStatus.SEMI_ACTIVE })} className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-xs hover:bg-orange-200">{row.semiActive}</button>
                        ) : "-"}
                      </td>
                      <td className="p-3 px-4 text-center">
                        {row.inactive > 0 ? (
                           <button onClick={() => onDrillDown({ rep: selectedRep, city: row.city, status: ClientStatus.INACTIVE })} className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-xs hover:bg-red-200">{row.inactive}</button>
                        ) : "-"}
                      </td>
                      {/* ABC Cells */}
                      <td className="p-3 px-4 text-center border-l border-gray-50 bg-emerald-50/20">
                        {row.a > 0 ? (
                           <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px]">{row.a}</span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="p-3 px-4 text-center bg-blue-50/20">
                        {row.b > 0 ? (
                           <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px]">{row.b}</span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="p-3 px-4 text-center bg-amber-50/20">
                        {row.c > 0 ? (
                           <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-black text-[10px]">{row.c}</span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="p-3 px-4 text-center font-bold border-l border-gray-50">
                        <button onClick={() => onDrillDown({ rep: selectedRep, city: row.city })} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200">{row.total}</button>
                      </td>
                      <td className="p-3 px-4 text-right text-gray-600">
                        {row.population.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr style={{ height: `${paddingBottom}px` }}>
                    <td colSpan={3} />
                  </tr>
                )}
              </>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10">
            <tr className="bg-gray-100 text-gray-800 font-bold border-t-2 border-gray-300 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
              <td className="p-4">Total Geral</td>
              <td className="p-4 text-center bg-green-50">{totals.active}</td>
              <td className="p-4 text-center bg-orange-50">{totals.semi}</td>
              <td className="p-4 text-center bg-red-50">{totals.inactive}</td>
              <td className="p-4 text-center bg-emerald-100/50">{totals.a}</td>
              <td className="p-4 text-center bg-blue-100/50">{totals.b}</td>
              <td className="p-4 text-center bg-amber-100/50">{totals.c}</td>
              <td className="p-4 text-center bg-blue-50">{totals.total}</td>
              <td className="p-4 text-right">{totals.pop.toLocaleString('pt-BR')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default RepresentativeTab;