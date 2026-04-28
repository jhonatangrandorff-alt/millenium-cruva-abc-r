import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ClientRecord, CityViewRow, ClientStatus } from '../types';
import { useVirtualizer } from '../hooks/useVirtualizer';

interface SupervisorTabProps {
  data: ClientRecord[];
  onExport: (data: any[], filename: string) => void;
  onDrillDown: (filters: { rep?: string; city?: string; status?: ClientStatus | ClientStatus[]; supervisor?: string }) => void;
}

const ITEM_HEIGHT = 57; // Estimated row height

// Persistence Keys
const KEY_SUP_NAME = 'MILLENIUM_PREF_SUP_NAME';
const KEY_DATE_START = 'MILLENIUM_PREF_DATE_START';
const KEY_DATE_END = 'MILLENIUM_PREF_DATE_END';

type SortKey = keyof CityViewRow;

const SupervisorTab: React.FC<SupervisorTabProps> = ({ data, onExport, onDrillDown }) => {
  // Initialize from LocalStorage
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>(() => localStorage.getItem(KEY_SUP_NAME) || '');
  const [startDate, setStartDate] = useState(() => localStorage.getItem(KEY_DATE_START) || '2022-01-01');
  const [endDate, setEndDate] = useState(() => localStorage.getItem(KEY_DATE_END) || new Date().toISOString().split('T')[0]);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'total', // Default sort by Total
    direction: 'desc'
  });

  // Persist Changes
  useEffect(() => { localStorage.setItem(KEY_SUP_NAME, selectedSupervisor); }, [selectedSupervisor]);
  useEffect(() => { localStorage.setItem(KEY_DATE_START, startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem(KEY_DATE_END, endDate); }, [endDate]);

  // Searchable Select States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(selectedSupervisor);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync SearchTerm
  useEffect(() => { setSearchTerm(selectedSupervisor); }, [selectedSupervisor]);

  // Extract unique Supervisors
  const supervisors = useMemo(() => 
    Array.from(new Set(data.map(d => d.supervisor))).sort(),
  [data]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // Revert to selectedSupervisor if invalid
        if (!supervisors.includes(searchTerm) && searchTerm !== '') {
           setSearchTerm(selectedSupervisor);
        } else if (searchTerm === '') {
           setSearchTerm(selectedSupervisor);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, selectedSupervisor, searchTerm, supervisors]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return supervisors;
    return supervisors.filter(s => 
      s.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [supervisors, searchTerm]);

  const handleSelectSupervisor = (sup: string) => {
    setSelectedSupervisor(sup);
    setSearchTerm(sup);
    setIsDropdownOpen(false);
  };

  const handleClearFilters = () => {
    // Reset Dates
    setStartDate('2022-01-01');
    setEndDate(new Date().toISOString().split('T')[0]);

    // Clear Supervisor Selection (Make it blank)
    setSelectedSupervisor('');
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
    if (!selectedSupervisor) return [];

    // 1. Filter by Supervisor and Date
    const filtered = data.filter(item => {
      const matchSup = item.supervisor === selectedSupervisor;
      // A data não deve ter correlação para filtro conforme solicitado
      // const matchDate = item.lastPurchaseDate >= startDate && item.lastPurchaseDate <= endDate;
      return matchSup;
    });

    // 2. Group by Representative (Using rep3 now)
    const repMap = new Map<string, CityViewRow>();

    filtered.forEach(item => {
      // Use rep3 for grouping
      const repKey = item.rep3;

      if (!repMap.has(repKey)) {
        repMap.set(repKey, {
          representativeName: repKey,
          active: 0,
          semiActive: 0,
          inactive: 0,
          a: 0,
          b: 0,
          c: 0,
          total: 0
        });
      }
      const entry = repMap.get(repKey)!;
      
      if (item.status === ClientStatus.ACTIVE) entry.active++;
      else if (item.status === ClientStatus.SEMI_ACTIVE) entry.semiActive++;
      else if (item.status === ClientStatus.INACTIVE) entry.inactive++;
      
      if (item.abc === 'A') entry.a++;
      else if (item.abc === 'B') entry.b++;
      else if (item.abc === 'C') entry.c++;

      entry.total++;
    });

    const rows = Array.from(repMap.values());

    // 3. Sort
    return rows.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [selectedSupervisor, startDate, endDate, data, sortConfig]);

  // Totals
  const totals = tableData.reduce((acc, curr) => ({
    active: acc.active + curr.active,
    semi: acc.semi + curr.semiActive,
    inactive: acc.inactive + curr.inactive,
    a: acc.a + curr.a,
    b: acc.b + curr.b,
    c: acc.c + curr.c,
    total: acc.total + curr.total
  }), { active: 0, semi: 0, inactive: 0, a: 0, b: 0, c: 0, total: 0 });

  const activeRepsCount = tableData.length;

  const handleExport = () => {
    const csvData = tableData.map(row => ({
      'Supervisor': selectedSupervisor,
      'Representante': row.representativeName,
      'Ativo': row.active,
      'Semi-ativo': row.semiActive,
      'Inativo': row.inactive,
      'Total Geral': row.total
    }));
    onExport(csvData, `Status_Supervisor_${selectedSupervisor}_${startDate}_${endDate}`);
  };

  // Virtualization
  const { virtualItems, paddingTop, paddingBottom } = useVirtualizer({
    count: tableData.length,
    itemHeight: ITEM_HEIGHT,
    containerRef: containerRef,
    overscan: 5
  });

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <i className="fas fa-sort text-white/30 ml-2 text-xs"></i>;
    return sortConfig.direction === 'asc' 
      ? <i className="fas fa-sort-up text-white ml-2 text-xs"></i> 
      : <i className="fas fa-sort-down text-white ml-2 text-xs"></i>;
  };

  return (
    <div className="flex flex-col gap-6">
       {/* Header / Filters Container */}
       {/* Removed overflow-hidden and added specific rounding to children to allow dropdown overflow */}
       <div className="flex flex-col md:flex-row gap-0 border border-gray-200 shadow-lg rounded-2xl relative z-20">
        
        {/* Left Side: Info Panel */}
        <div className="flex-1 flex flex-col">
          {/* Supervisor Select - Searchable */}
          {/* Added rounding to top left/right based on breakpoint */}
          <div className="flex items-center bg-blue-900 text-white p-4 relative rounded-t-2xl md:rounded-tr-none md:rounded-tl-2xl" ref={dropdownRef}>
            <span className="font-bold w-32 text-blue-200 shrink-0">Setor / Sup.</span>
            <div className="flex-1 relative group">
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onClick={() => setIsDropdownOpen(true)}
                placeholder="Buscar supervisor..."
                className="w-full bg-blue-800/50 text-white border border-blue-700 rounded-lg text-sm p-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-300 font-bold uppercase"
              />
               <div 
                className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer text-blue-300 hover:text-white"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <i className={`fas fa-chevron-down text-xs transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}></i>
              </div>

              {/* Dropdown List */}
              {isDropdownOpen && (
                <ul className="absolute left-0 top-full mt-1 w-full bg-white text-gray-800 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 animate-fade-in border border-gray-200">
                   {filteredOptions.length === 0 ? (
                    <li className="p-3 text-sm text-gray-400 text-center italic">Nenhum supervisor encontrado</li>
                  ) : (
                    filteredOptions.map((sup) => (
                      <li 
                        key={sup}
                        onClick={() => handleSelectSupervisor(sup)}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-none uppercase ${sup === selectedSupervisor ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}
                      >
                        {sup}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center bg-yellow-400 text-blue-900 p-3 px-6 font-bold justify-between border-b border-yellow-300/50">
              <span className="uppercase text-xs opacity-80">Total Clientes (Filtro)</span>
              <span className="text-xl">{totals.total}</span>
            </div>
            {/* Added rounding to bottom left for desktop */}
            <div className="flex items-center bg-blue-50 text-blue-900 p-3 px-6 font-bold justify-between md:rounded-bl-2xl">
              <span className="uppercase text-xs opacity-70">Representantes no Setor</span>
              <span className="text-lg">{activeRepsCount}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Date & Actions */}
        {/* Added rounding to bottom right/top right based on breakpoint */}
        <div className="w-full md:w-80 bg-gray-50 p-6 flex flex-col justify-center border-l border-gray-200 rounded-b-2xl md:rounded-bl-none md:rounded-r-2xl">
          <div className="font-bold text-center mb-4 text-gray-500 uppercase text-xs tracking-wider">Período da Análise</div>
          
          <div className="space-y-3">
             <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
              <span className="font-bold text-gray-400 text-xs px-2">DE</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-right text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
              <span className="font-bold text-gray-400 text-xs px-2">ATÉ</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="text-right text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <button 
            onClick={handleClearFilters}
            className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-600 w-full py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all"
          >
            <i className="fas fa-eraser"></i> Limpar Filtros
          </button>

          <button 
            onClick={handleExport}
            className="mt-2 bg-green-600 hover:bg-green-700 text-white w-full py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <i className="fas fa-file-excel"></i> Exportar Dados
          </button>
        </div>
      </div>

      {/* Table - Virtualized */}
      <div 
        ref={containerRef}
        className="overflow-auto max-h-[600px] rounded-2xl shadow-lg border border-gray-200 relative bg-white"
      >
        <table className="w-full text-sm font-sans border-collapse table-fixed">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="text-white">
              <th 
                className="bg-blue-900 text-left p-4 w-[40%] cursor-pointer hover:bg-blue-800 transition-colors select-none"
                onClick={() => handleSort('representativeName')}
              >
                Representante (Rep 3) {renderSortIcon('representativeName')}
              </th>
              <th className="bg-green-600 text-center p-4 w-[12%] cursor-pointer hover:bg-green-500 transition-colors select-none" onClick={() => handleSort('active')}>Ativo {renderSortIcon('active')}</th>
              <th className="bg-orange-400 text-center p-4 w-[12%] cursor-pointer hover:bg-orange-300 transition-colors select-none" onClick={() => handleSort('semiActive')}>Semi {renderSortIcon('semiActive')}</th>
              <th className="bg-red-600 text-center p-4 w-[12%] cursor-pointer hover:bg-red-500 transition-colors select-none" onClick={() => handleSort('inactive')}>Inat. {renderSortIcon('inactive')}</th>
              <th className="bg-gray-900 text-center p-4 w-[15%] cursor-pointer hover:bg-gray-800 transition-colors select-none" onClick={() => handleSort('total')}>Total {renderSortIcon('total')}</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50">
                 {selectedSupervisor ? "Nenhum dado para este período" : "Selecione um supervisor para visualizar os dados"}
               </td></tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr style={{ height: `${paddingTop}px` }}>
                    <td colSpan={5} />
                  </tr>
                )}
                {virtualItems.map((index) => {
                  const row = tableData[index];
                  return (
                    <tr key={index} className="bg-white border-b border-gray-100 hover:bg-blue-50 transition-colors text-gray-800 h-[57px] box-border">
                      <td className="p-3 px-4 font-medium border-r border-gray-100">{row.representativeName}</td>
                      
                      {/* Active Cell */}
                      <td className="p-3 px-4 text-center border-r border-gray-100">
                        {row.active > 0 ? (
                           <button 
                             onClick={() => onDrillDown({ rep: row.representativeName, supervisor: selectedSupervisor, status: ClientStatus.ACTIVE })}
                             className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-black text-sm hover:bg-green-200 transition-all transform hover:scale-105 shadow-sm"
                           >
                             {row.active}
                           </button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>

                      {/* Semi-Active Cell */}
                      <td className="p-3 px-4 text-center border-r border-gray-100">
                        {row.semiActive > 0 ? (
                           <button 
                            onClick={() => onDrillDown({ rep: row.representativeName, supervisor: selectedSupervisor, status: ClientStatus.SEMI_ACTIVE })}
                            className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-black text-sm hover:bg-orange-200 transition-all transform hover:scale-105 shadow-sm"
                           >
                             {row.semiActive}
                           </button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>

                      {/* Inactive Cell */}
                      <td className="p-3 px-4 text-center border-r border-gray-100">
                        {row.inactive > 0 ? (
                           <button 
                            onClick={() => onDrillDown({ rep: row.representativeName, supervisor: selectedSupervisor, status: ClientStatus.INACTIVE })}
                            className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-black text-sm hover:bg-red-200 transition-all transform hover:scale-105 shadow-sm"
                           >
                             {row.inactive}
                           </button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      {/* Total Cell */}
                      <td className="p-3 px-4 text-center font-bold text-gray-700">
                        {row.total > 0 ? (
                          <button 
                            onClick={() => onDrillDown({ rep: row.representativeName, supervisor: selectedSupervisor })}
                            className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-black text-sm hover:bg-blue-200 transition-all transform hover:scale-105 shadow-sm"
                          >
                            {row.total}
                          </button>
                        ) : 0}
                      </td>
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr style={{ height: `${paddingBottom}px` }}>
                    <td colSpan={5} />
                  </tr>
                )}
              </>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10">
            <tr className="bg-white text-gray-900 font-black border-t-2 border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] h-[60px]">
              <td className="p-4 bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider">Total Geral</td>
              <td 
                className="bg-green-600 text-white p-4 text-center border-x border-white/10 cursor-pointer hover:bg-green-500 transition-colors"
                onClick={() => selectedSupervisor && onDrillDown({ supervisor: selectedSupervisor, status: ClientStatus.ACTIVE })}
              >
                {totals.active}
              </td>
              <td 
                className="bg-orange-500 text-white p-4 text-center border-x border-white/10 cursor-pointer hover:bg-orange-400 transition-colors"
                onClick={() => selectedSupervisor && onDrillDown({ supervisor: selectedSupervisor, status: ClientStatus.SEMI_ACTIVE })}
              >
                {totals.semi}
              </td>
              <td 
                className="bg-red-700 text-white p-4 text-center border-x border-white/10 cursor-pointer hover:bg-red-600 transition-colors"
                onClick={() => selectedSupervisor && onDrillDown({ supervisor: selectedSupervisor, status: ClientStatus.INACTIVE })}
              >
                {totals.inactive}
              </td>
              <td 
                className="bg-gray-900 text-white p-4 text-center cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => selectedSupervisor && onDrillDown({ supervisor: selectedSupervisor })}
              >
                {totals.total}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default SupervisorTab;