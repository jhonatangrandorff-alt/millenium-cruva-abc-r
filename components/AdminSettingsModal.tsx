
import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { supabaseService } from '../services/supabaseService';

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

  const addUser = async () => {
    if (!newUsername || !newPassword) {
      alert('Preencha o usuário e a senha.');
      return;
    }
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
      // Save directly to Supabase
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
              <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-user-plus"></i> Cadastrar Novo Usuário
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Usuário"
                    className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-xs font-bold text-blue-900 uppercase mb-2">Acesso aos Setores (Selecione um ou mais)</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white border rounded-xl">
                    <button
                      onClick={() => toggleSector('GERAL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${newSectors.includes('GERAL') ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      GERAL (Todos)
                    </button>
                    {supervisors.filter(s => s !== 'GERAL' && s !== '').map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSector(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${newSectors.includes(s) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={addUser}
                  className="mt-4 w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-all"
                >
                  Adicionar Usuário
                </button>
              </div>

              <h4 className="font-bold text-gray-700 mb-4 px-2">Usuários Cadastrados</h4>
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Nenhum usuário cadastrado.</p>
                ) : (
                  accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-blue-900">
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
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border text-gray-400">••••••</span>
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
                        const { error } = await (supabaseService as any).supabase
                          .from('base_oficial_millenium')
                          .delete()
                          .neq('id', '0'); 
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
