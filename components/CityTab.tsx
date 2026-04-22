import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ClientRecord, CityViewRow, ClientStatus } from '../types';
import { useVirtualizer } from '../hooks/useVirtualizer';

interface CityTabProps {
  data: ClientRecord[];
  onExport: (data: any[], filename: string) => void;
  onDrillDown: (filters: { rep?: string; city?: string; status?: ClientStatus | ClientStatus[] }) => void;
}

const ITEM_HEIGHT = 57; // Estimated row height

// Persistence Keys
const KEY_CITY_NAME = 'MILLENIUM_PREF_CITY_NAME';
const KEY_DATE_START = 'MILLENIUM_PREF_DATE_START';
const KEY_DATE_END = 'MILLENIUM_PREF_DATE_END';

type SortKey = keyof CityViewRow;

const CityTab: React.FC<CityTabProps> = ({ data, onExport, onDrillDown }) => {
  // Initialize from LocalStorage
  const [selectedCity, setSelectedCity] = useState<string>(() => localStorage.getItem(KEY_CITY_NAME) || '');
  const [startDate, setStartDate] = useState(() => localStorage.getItem(KEY_DATE_START) || '2022-01-01');
  const [endDate, setEndDate] = useState(() => localStorage.getItem(KEY_DATE_END) || new Date().toISOString().split('T')[0]);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'total', // Default sort by Total
    direction: 'desc'
  });

  // Persist Changes
  useEffect(() => { localStorage.setItem(KEY_CITY_NAME, selectedCity); }, [selectedCity]);
  useEffect(() => { localStorage.setItem(KEY_DATE_START, startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem(KEY_DATE_END, endDate); }, [endDate]);

  // Searchable Select States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(selectedCity);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync searchTerm
  useEffect(() => { setSearchTerm(selectedCity); }, [selectedCity]);

  // Extract unique cities with state "CITY - UF"
  const cities = useMemo(() => 
    Array.from(new Set(data.map(d => `${d.city} - ${d.state}`))).sort(),
  [data]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // Revert to selectedCity if invalid
        if (!cities.includes(searchTerm) && searchTerm !== '') {
           setSearchTerm(selectedCity);
        } else if (searchTerm === '') {
           setSearchTerm(selectedCity);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, selectedCity, searchTerm, cities]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return cities;
    return cities.filter(c => 
      c.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cities, searchTerm]);

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSearchTerm(city);
    setIsDropdownOpen(false);
  };

  const handleClearFilters = () => {
    // Reset Dates
    setStartDate('2022-01-01');
    setEndDate(new Date().toISOString().split('T')[0]);

    // Clear City Selection (Make it blank)
    setSelectedCity('');
    setSearchTerm('');
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get current city population
  const currentCityPop = useMemo(() => {
    const record = data.find(d => `${d.city} - ${d.state}` === selectedCity);
    return record ? record.population : 0;
  }, [selectedCity, data]);

  // Filter and Aggregate Data
  const tableData = useMemo(() => {
    if (!selectedCity) return [];

    // 1. Filter by City+State Key and Date
    const filtered = data.filter(item => {
      const itemKey = `${item.city} - ${item.state}`;
      const matchCity = itemKey === selectedCity;
      // A data não deve ter correlação para filtro conforme solicitado
      // const matchDate = item.lastPurchaseDate >= startDate && item.lastPurchaseDate <= endDate;
      return matchCity;
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
          total: 0
        });
      }
      const entry = repMap.get(repKey)!;
      
      if (item.status === ClientStatus.ACTIVE) entry.active++;
      else if (item.status === ClientStatus.SEMI_ACTIVE) entry.semiActive++;
      else if (item.status === ClientStatus.INACTIVE) entry.inactive++;
      
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
  }, [selectedCity, startDate, endDate, data, sortConfig]);

  // Totals
  const totals = tableData.reduce((acc, curr) => ({
    active: acc.active + curr.active,
    semi: acc.semi + curr.semiActive,
    inactive: acc.inactive + curr.inactive,
    total: acc.total + curr.total
  }), { active: 0, semi: 0, inactive: 0, total: 0 });

  const activeRepsCount = tableData.length;

  const handleExport = () => {
    const csvData = tableData.map(row => ({
      'Representante': row.representativeName,
      'Ativo': row.active,
      'Semi-ativo': row.semiActive,
      'Inativo': row.inactive,
      'Total Geral': row.total
    }));
    onExport(csvData, `Status_Cidade_${selectedCity.replace(/ - /g, '_')}_${startDate}_${endDate}`);
  };

  // Extract pure city name for DrillDown compatibility
  const getCityNameForDrillDown = () => {
    return selectedCity.split(' - ')[0];
  };
  const drillCity = getCityNameForDrillDown();

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
       <div className="flex flex-col md:flex-row gap-0 border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
        
        {/* Left Side: Info Panel */}
        <div className="flex-1 flex flex-col">
          {/* City Select - Searchable */}
          <div className="flex items-center bg-blue-900 text-white p-4 relative" ref={dropdownRef}>
            <span className="font-bold w-20 text-blue-200 shrink-0">Cidade</span>
            <div className="flex-1 relative group">
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onClick={() => setIsDropdownOpen(true)}
                placeholder="Buscar cidade..."
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
                    <li className="p-3 text-sm text-gray-400 text-center italic">Nenhuma cidade encontrada</li>
                  ) : (
                    filteredOptions.map((city) => (
                      <li 
                        key={city}
                        onClick={() => handleSelectCity(city)}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-none uppercase ${city === selectedCity ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}
                      >
                        {city}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center bg-yellow-400 text-blue-900 p-3 px-6 font-bold justify-between border-b border-yellow-300/50">
              <span className="uppercase text-xs opacity-80">Habitantes</span>
              <span className="text-xl">{currentCityPop.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center bg-blue-50 text-blue-900 p-3 px-6 font-bold justify-between">
              <span className="uppercase text-xs opacity-70">Representantes Ativos</span>
              <span className="text-lg">{activeRepsCount}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Date & Actions */}
        <div className="w-full md:w-80 bg-gray-50 p-6 flex flex-col justify-center border-l border-gray-200">
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

          <div className="flex gap-2 mt-6">
            <button 
              onClick={handleClearFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-4 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all"
              title="Limpar Filtros (Nome e Datas)"
            >
              <i className="fas fa-eraser"></i>
            </button>

            <button 
              onClick={handleExport}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <i className="fas fa-file-excel"></i> Exportar Dados
            </button>
          </div>
        </div>
      </div>

      {/* Table - Virtualized */}
      <div 
        ref={containerRef}
        className="overflow-auto max-h-[600px] rounded-2xl shadow-lg border border-gray-200 relative"
      >
        <table className="w-full text-sm font-sans border-collapse">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="text-white">
              <th 
                className="bg-blue-900 text-left p-4 w-1/3 cursor-pointer hover:bg-blue-800 transition-colors select-none"
                onClick={() => handleSort('representativeName')}
              >
                Representante (Rep 3) {renderSortIcon('representativeName')}
              </th>
              <th 
                className="bg-green-600 text-center p-4 cursor-pointer hover:bg-green-500 transition-colors select-none"
                onClick={() => handleSort('active')}
              >
                Ativo {renderSortIcon('active')}
              </th>
              <th 
                className="bg-orange-400 text-center p-4 cursor-pointer hover:bg-orange-300 transition-colors select-none"
                onClick={() => handleSort('semiActive')}
              >
                Semi-Ativo {renderSortIcon('semiActive')}
              </th>
              <th 
                className="bg-red-600 text-center p-4 cursor-pointer hover:bg-red-500 transition-colors select-none"
                onClick={() => handleSort('inactive')}
              >
                Inativo {renderSortIcon('inactive')}
              </th>
              <th 
                className="bg-gray-900 text-center p-4 cursor-pointer hover:bg-gray-800 transition-colors select-none"
                onClick={() => handleSort('total')}
              >
                Total Geral {renderSortIcon('total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50">
                 {selectedCity ? "Nenhum dado para este período" : "Selecione uma cidade para visualizar os dados"}
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
                             onClick={() => onDrillDown({ rep: row.representativeName, city: drillCity, status: ClientStatus.ACTIVE })}
                             className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs hover:bg-green-200 transition-colors"
                           >
                             {row.active}
                           </button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>

                      {/* Semi-Active Cell */}
                      <td className="p-3 px-4 text-center border-r border-gray-100">
                        {row.semiActive > 0 ? (
                           <button 
                            onClick={() => onDrillDown({ rep: row.representativeName, city: drillCity, status: ClientStatus.SEMI_ACTIVE })}
                            className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-xs hover:bg-orange-200 transition-colors"
                           >
                             {row.semiActive}
                           </button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>

                      {/* Inactive Cell */}
                      <td className="p-3 px-4 text-center border-r border-gray-100">
                        {row.inactive > 0 ? (
                           <button 
                            onClick={() => onDrillDown({ rep: row.representativeName, city: drillCity, status: ClientStatus.INACTIVE })}
                            className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-xs hover:bg-red-200 transition-colors"
                           >
                             {row.inactive}
                           </button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      
                      {/* Total Cell */}
                      <td className="p-3 px-4 text-center font-bold text-gray-700">
                        {row.total > 0 ? (
                            <button 
                              onClick={() => onDrillDown({ rep: row.representativeName, city: drillCity })}
                              className="px-3 py-1 rounded-full bg-gray-200 text-gray-900 font-bold text-xs hover:bg-gray-300 transition-colors"
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
            <tr className="text-white font-bold text-center shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
              <td className="bg-blue-900 text-left p-4">Total Geral</td>
              <td 
                className="bg-green-600 p-4 cursor-pointer hover:bg-green-500 transition-colors"
                onClick={() => onDrillDown({ city: drillCity, status: ClientStatus.ACTIVE })}
                title="Ver detalhes de Ativos"
              >
                {totals.active}
              </td>
              <td 
                className="bg-orange-500 p-4 cursor-pointer hover:bg-orange-400 transition-colors"
                onClick={() => onDrillDown({ city: drillCity, status: ClientStatus.SEMI_ACTIVE })}
                title="Ver detalhes de Semi-ativos"
              >
                {totals.semi}
              </td>
              <td 
                className="bg-red-700 p-4 cursor-pointer hover:bg-red-600 transition-colors"
                onClick={() => onDrillDown({ city: drillCity, status: ClientStatus.INACTIVE })}
                title="Ver detalhes de Inativos"
              >
                {totals.inactive}
              </td>
              <td 
                className="bg-gray-900 p-4 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => onDrillDown({ city: drillCity })}
                title="Ver detalhes Geral"
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

export default CityTab;