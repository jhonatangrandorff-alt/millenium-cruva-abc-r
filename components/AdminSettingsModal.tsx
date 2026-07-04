
import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { supabaseService, supabase } from '../services/supabaseService';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisors: string[];
  userAccounts: UserAccount[];
  onSave: (accounts: UserAccount[]) => void;
}

const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  supervisors,
  userAccounts,
  onSave
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>(userAccounts);
  useEffect(() => {
    // Only update if we have new data from parent and we haven't modified it locally yet
    if (userAccounts.length !== accounts.length || accounts.length === 0) {
      setAccounts(userAccounts);
    }
  }, [userAccounts]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState('');

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSectors, setNewSectors] = useState<string[]>(['GERAL']);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [sectorSearch, setSectorSearch] = useState('');

  const filteredSupervisors = supervisors
    .filter(s => s !== 'GERAL' && s !== '')
    .filter(s => s.toLowerCase().includes(sectorSearch.toLowerCase()));

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass === 'admin123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha de administrador incorreta.');
    }
  };

  const toggleSector = (sector: string) => {
    setNewSectors(prev => {
      if (sector === 'GERAL') return ['GERAL'];
      const filtered = prev.filter(s => s !== 'GERAL');
      if (filtered.includes(sector)) {
        const next = filtered.filter(s => s !== sector);
        return next.length === 0 ? ['GERAL'] : next;
      }
      return [...filtered, sector];
    });
  };

  const startEdit = (user: UserAccount) => {
    setEditingUser(user);
    setNewUsername(user.username);
    setNewPassword(user.password);
    setNewSectors(user.sectors || ['GERAL']);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewUsername('');
    setNewPassword('');
    setNewSectors(['GERAL']);
  };

  const saveUserChanges = async () => {
    if (!newUsername || !newPassword) {
      alert('Preencha o usuário e a senha.');
      return;
    }

    if (editingUser) {
      const updatedUser: UserAccount = {
        ...editingUser,
        username: newUsername,
        password: newPassword,
        sectors: newSectors
      };

      try {
        await supabaseService.saveUser(null, updatedUser);
        setAccounts(prev => {
          const next = prev.map(a => a.id === editingUser.id ? updatedUser : a);
          onSave(next);
          return next;
        });
        cancelEdit();
      } catch (err: any) {
        alert('Erro ao atualizar usuário na nuvem: ' + err.message);
      }
    } else {
      if (accounts.some(a => a.username === newUsername)) {
        alert('Este usuário já existe.');
        return;
      }
      const newUser: UserAccount = {
        id: Date.now().toString(),
        username: newUsername,
        password: newPassword,
        sectors: newSectors
      };

      try {
        await supabaseService.saveUser(null, newUser);
        setAccounts(prev => {
          const next = [...prev, newUser];
          onSave(next);
          return next;
        });
        setNewUsername('');
        setNewPassword('');
        setNewSectors(['GERAL']);
      } catch (err: any) {
        alert('Erro ao salvar usuário na nuvem: ' + err.message);
      }
    }
  };

  const removeUser = async (id: string) => {
    try {
      await supabaseService.deleteUser(null, id);
      setAccounts(prev => {
        const next = prev.filter(a => a.id !== id);
        onSave(next);
        return next;
      });
    } catch (err: any) {
      alert('Erro ao excluir usuário da nuvem: ' + err.message);
    }
  };

  const handleSave = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <style>{`
        .custom-scrollbar-visible::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar-visible::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 6px;
        }
        .custom-scrollbar-visible::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 2px solid #f8fafc;
        }
        .custom-scrollbar-visible::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-900 text-white p-6 font-bold flex justify-between items-center">
          <div className="flex items-center gap-3">
            <i className="fas fa-users-cog"></i>
            <span>Gerenciamento de Usuários</span>
          </div>
          <button onClick={onClose} className="hover:text-yellow-400 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="p-8">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Acesso Restrito</h3>
            <p className="text-gray-500 mb-6">Insira a senha do Supervisor Geral para gerenciar os usuários.</p>
            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="password"
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
                className="w-full border p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Senha Admin"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-800 transition-all">
                Autenticar
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className={`mb-8 p-6 ${editingUser ? 'bg-yellow-50/50 border-yellow-200' : 'bg-blue-50 border-blue-100'} rounded-2xl border`}>
                <h4 className="font-bold text-blue-900 mb-4 flex items-center justify-between text-left">
                  <span className="flex items-center gap-2">
                    {editingUser ? (
                      <>
                        <i className="fas fa-user-edit text-yellow-600"></i>
                        <span>Editar Usuário: <span className="underline">{editingUser.username}</span></span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus"></i>
                        <span>Cadastrar Novo Usuário</span>
                      </>
                    )}
                  </span>
                  {editingUser && (
                    <button 
                      onClick={cancelEdit}
                      className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded-lg font-bold transition-all"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Usuário"
                    disabled={!!editingUser}
                    className={`p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : ''}`}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Senha"
                    className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <label className="text-xs font-bold text-blue-900 uppercase">
                      Acesso aos Setores (Selecione um ou mais)
                    </label>
                    <div className="relative w-full md:w-48">
                      <input
                        type="text"
                        value={sectorSearch}
                        onChange={e => setSectorSearch(e.target.value)}
                        placeholder="Buscar setor..."
                        className="w-full text-xs p-1.5 pl-6 border rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <i className="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                      {sectorSearch && (
                        <button 
                          onClick={() => setSectorSearch('')} 
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px]"
                        >
                          <i className="fas fa-times-circle"></i>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-2.5 bg-white border rounded-xl custom-scrollbar-visible">
                    <button
                      onClick={() => toggleSector('GERAL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${newSectors.includes('GERAL') ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      GERAL (Todos)
                    </button>
                    {filteredSupervisors.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSector(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${newSectors.includes(s) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {s}
                      </button>
                    ))}
                    {filteredSupervisors.length === 0 && sectorSearch && (
                      <p className="text-[11px] text-gray-400 p-2 w-full text-center">Nenhum setor encontrado com "{sectorSearch}"</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={saveUserChanges}
                  className={`mt-4 w-full ${editingUser ? 'bg-yellow-600 hover:bg-yellow-700 font-bold' : 'bg-blue-900 hover:bg-blue-800'} text-white py-3 rounded-xl font-bold transition-all`}
                >
                  {editingUser ? 'Salvar Alterações' : 'Adicionar Usuário'}
                </button>
              </div>

              <h4 className="font-bold text-gray-700 mb-4 px-2">Usuários Cadastrados</h4>
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Nenhum usuário cadastrado.</p>
                ) : (
                  accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-blue-900 shrink-0">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <p className="font-bold text-blue-900">{acc.username}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(acc.sectors || []).map(s => (
                              <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase tracking-wider">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border text-gray-400 hidden sm:inline">••••••</span>
                        <button
                          onClick={() => startEdit(acc)}
                          className="text-blue-500 hover:text-blue-700 p-2 transition-colors"
                          title="Editar Usuário"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => removeUser(acc.id)}
                          className="text-red-400 hover:text-red-600 p-2 transition-colors"
                          title="Remover Usuário"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100 mx-2">
                <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle"></i> Zona de Perigo (Nova Base v5)
                </h4>
                <p className="text-xs text-red-600 mb-4">Esta ação apaga TODOS os dados da nuvem para permitir uma nova importação do zero.</p>
                <button
                  onClick={async () => {
                    if (confirm("TEM CERTEZA? Isso apagará todos os clientes da nuvem permanentemente.")) {
                      try {
                        const { error } = await supabase
                          .from('base_oficial_millenium')
                          .delete()
                          .neq('Código', 'FORCAR_DELETE_TOTAL_000'); 
                        if (error) throw error;
                        alert("Base de dados limpa com sucesso! Reiniciando...");
                        window.location.reload();
                      } catch (err: any) {
                        alert("Erro ao limpar base: " + err.message);
                      }
                    }
                  }}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <i className="fas fa-trash"></i>
                  LIMPAR TODA A BASE DE DADOS (RESET)
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
              >
                Salvar e Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsModal;
