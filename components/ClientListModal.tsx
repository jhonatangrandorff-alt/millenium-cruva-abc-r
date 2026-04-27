import React, { useState, useMemo, useEffect } from 'react';
import { ClientRecord } from '../types';

interface ClientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  clients: ClientRecord[];
}

const ClientListModal: React.FC<ClientListModalProps> = ({ isOpen, onClose, title, clients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClientRecord; direction: 'asc' | 'desc' }>({
    key: 'daysSincePurchase', // Default sort by Days
    direction: 'asc'          // Default ASC (smallest to largest)
  });

  // Reset filters and sort when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSortConfig({ key: 'daysSincePurchase', direction: 'asc' });
    }
  }, [isOpen]);

  const handleSort = (key: keyof ClientRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedClients = useMemo(() => {
    let data = [...clients];

    // 1. Filter
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(client =>
        client.socialName.toLowerCase().includes(lowerTerm) ||
        client.fantasyName.toLowerCase().includes(lowerTerm) ||
        client.id.toLowerCase().includes(lowerTerm) ||
        client.city.toLowerCase().includes(lowerTerm) ||
        client.neighborhood.toLowerCase().includes(lowerTerm) ||
        client.representativeName.toLowerCase().includes(lowerTerm) ||
        client.status.toLowerCase().includes(lowerTerm) ||
        (client.abc || '').toLowerCase().includes(lowerTerm)
      );
    }

    // 2. Sort
    data.sort((a, b) => {
      const key = sortConfig.key;
      let valA: any = a[key];
      let valB: any = b[key];

      // Handle strings case-insensitive
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      // Comparison
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [clients, searchTerm, sortConfig]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (!processedClients || processedClients.length === 0) return;

    const headers = [
      'Código', 'Razão Social', 'Fantasia', 'CNPJ', 'Cidade/UF', 'Bairro', 'Ramo', 'Ult. Comp', 'Status', 'Curva ABC', 'Representante'
    ];

    const csvContent = [
      headers.join(';'),
      ...processedClients.map(client => {
        const row = [
          client.id,
          client.socialName,
          client.fantasyName,
          client.cnpj,
          `${client.city} - ${client.state}`,
          client.neighborhood,
          client.activity,
          client.daysSincePurchase,
          client.status,
          client.abc || 'C',
          client.representativeName
        ];

        return row.map(val => {
          let strVal = String(val ?? '');
          if (strVal.includes('"') || strVal.includes(';')) {
            strVal = `"${strVal.replace(/"/g, '""')}"`;
          }
          return strVal;
        }).join(';');
      })
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `exportacao_clientes.csv`;
    link.click();
  };

  // Helper to render sortable headers
  const renderHeader = (label: string, sortKey: keyof ClientRecord, align: 'left' | 'center' | 'right' = 'left') => (
    <th
      className={`p-3 text-${align} font-bold text-gray-600 border-b cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap group`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <div className="flex flex-col text-[10px] leading-none text-gray-400 group-hover:text-gray-500">
          <i className={`fas fa-caret-up ${sortConfig.key === sortKey && sortConfig.direction === 'asc' ? 'text-blue-600' : ''}`}></i>
          <i className={`fas fa-caret-down ${sortConfig.key === sortKey && sortConfig.direction === 'desc' ? 'text-blue-600' : ''}`}></i>
        </div>
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-blue-900 text-white p-6 gap-4">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <div className="bg-blue-800 p-2 rounded-lg">
              <i className="fas fa-list"></i>
            </div>
            <span className="truncate max-w-md md:max-w-xl">{title}</span>
          </h3>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Export Button */}
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center shadow-lg transition-colors whitespace-nowrap"
            >
              <i className="fas fa-file-excel mr-2"></i> Exportar
            </button>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300"></i>
              <input
                type="text"
                placeholder="Pesquisar na lista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-blue-800/50 border border-blue-700 text-white placeholder-blue-300 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-blue-800 transition-all text-sm"
              />
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-800 text-white hover:bg-yellow-400 hover:text-blue-900 transition-colors shadow-lg"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Modal Content - Scrollable Table */}
        <div className="overflow-auto p-0 flex-1 bg-gray-50">
          <table className="min-w-full text-xs border-collapse">
            <thead className="bg-white sticky top-0 shadow-sm z-10">
              <tr>
                {renderHeader('Código', 'id')}
                {renderHeader('Razão Social', 'socialName')}
                {renderHeader('Fantasia', 'fantasyName')}
                {renderHeader('CNPJ', 'cnpj')}
                {renderHeader('Cidade/UF', 'city')}
                {renderHeader('Bairro', 'neighborhood')}
                {renderHeader('Ramo', 'activity')}
                {/* Renamed 'Dias' to 'Ult. Comp', Removed Date column */}
                {renderHeader('Ult. Comp', 'daysSincePurchase', 'center')}
                {renderHeader('Status', 'status', 'center')}
                {renderHeader('ABC', 'abc', 'center')}
                {renderHeader('Representante', 'representativeName')}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedClients.map((client, idx) => (
                <tr key={client.id} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="p-3 text-gray-500 font-mono">{client.id}</td>
                  <td className="p-3 font-bold text-gray-800">{client.socialName}</td>
                  <td className="p-3 text-gray-600">{client.fantasyName}</td>
                  <td className="p-3 whitespace-nowrap text-gray-500">{client.cnpj}</td>
                  <td className="p-3 text-gray-600">{client.city} - {client.state}</td>
                  <td className="p-3 text-gray-500">{client.neighborhood}</td>
                  <td className="p-3 text-gray-600">{client.activity}</td>
                  {/* Days since purchase cell */}
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${client.daysSincePurchase > 60 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                      {client.daysSincePurchase}
                    </span>
                  </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${client.abc === 'A' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          client.abc === 'B' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                        {client.abc || 'C'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{client.representativeName}</td>
                </tr>
              ))}
              {processedClients.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center p-8 text-gray-400 italic">
                    {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Nenhum registro encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="bg-white p-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Total: {processedClients.length}
            {clients.length !== processedClients.length && <span className="text-xs font-normal ml-1"> (Filtrado de {clients.length})</span>}
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientListModal;