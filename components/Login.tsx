
import React, { useState } from 'react';
import { UserAccount } from '../types';

interface LoginProps {
  userAccounts: UserAccount[];
  onLogin: (sectors: string[], username: string) => void;
  onOpenSettings: () => void;
}

const Login: React.FC<LoginProps> = ({ userAccounts, onLogin, onOpenSettings }) => {
  const [username, setUsername] = useState('GERAL');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    // Default 'geral' user
    if (username.toLowerCase() === 'geral' && password === 'MILL@2026') {
      onLogin(['GERAL'], 'geral');
      return;
    }

    const account = userAccounts.find(a => a.username === username);

    if (account && account.password === password) {
      onLogin(account.sectors, account.username);
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-900 flex items-center justify-center p-4 z-[200]">
      <div className="absolute top-6 right-6">
        <button
          onClick={onOpenSettings}
          className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center border border-white/20 transition-all shadow-lg"
          title="Configurações de Acesso"
        >
          <i className="fas fa-cog text-xl"></i>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 flex flex-col items-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <i className="fas fa-user-shield text-blue-900 text-3xl"></i>
        </div>

        <h2 className="text-2xl font-bold text-blue-900 mb-2">Millenium Dashboard</h2>
        <p className="text-gray-500 mb-8 text-center">Insira suas credenciais para acessar o sistema</p>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Usuário</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Seu usuário"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <i className="fas fa-user text-gray-300"></i>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Senha</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Sua senha"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <i className="fas fa-lock text-gray-300"></i>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-lg active:scale-95"
          >
            <span>Entrar no Sistema</span>
            <i className="fas fa-sign-in-alt"></i>
          </button>
        </form>

        <p className="mt-8 text-xs text-gray-400">© 2026 Millenium Utilidades</p>
      </div>
    </div>
  );
};

export default Login;
