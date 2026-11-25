import React, { useState } from 'react';

interface GptIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GptIntegrationModal: React.FC<GptIntegrationModalProps> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState(() => {
    return (
      (import.meta as any).env?.VITE_GPT_API_TOKEN ||
      localStorage.getItem('MILLENIUM_GPT_API_TOKEN') ||
      'millenium_ai_token_2026'
    );
  });
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  
  // Teste de API
  const [testEndpoint, setTestEndpoint] = useState('/api/summary');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://millenium-curva-abc.vercel.app';
  const openApiUrl = `${currentOrigin}/openapi.json`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleTestApi = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(testEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(JSON.stringify({ error: err.message || 'Falha ao conectar com o endpoint' }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  const gptCustomPrompt = `Você é o Assistente Especialista de Inteligência Comercial da Millenium.
Sua função é apoiar a diretoria, supervisores e representantes comerciais analisando os dados da base de clientes da empresa através das Actions integradas à API.

Regras de negócio da Millenium:
1. CURVA ABC:
   - Curva A: Clientes que compraram nos últimos 30 dias (altamente ativos).
   - Curva B: Clientes com última compra entre 31 e 90 dias (atenção para não inativar).
   - Curva C: Clientes sem compras há mais de 90 dias (inativos ou em risco crítico).
2. SITUAÇÃO DO CLIENTE:
   - Ativo: Compra regular.
   - Semi-Ativo: Em fase de desaceleração.
   - Inativo: Requer campanha de reativação imediata.

Como você deve atuar:
- Sempre que o usuário perguntar sobre o panorama geral, chame a action 'obterResumoGeral'.
- Quando pedir clientes inativos, por representante ou cidade, use 'consultarClientes' com os filtros adequados.
- Ao apresentar dados, formate em tabelas ou tópicos organizados, destacando Razão Social, Cidade, Dias sem Comprar e Representante.
- Sempre sugira estratégias práticas de recuperação para clientes Curva C.`;

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
              <i className="fas fa-robot text-emerald-300"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Conectar com ChatGPT (Custom GPT)
                <span className="bg-emerald-400/20 text-emerald-200 text-xs px-2 py-0.5 rounded-full border border-emerald-400/30">
                  REST API com Token
                </span>
              </h2>
              <p className="text-xs text-emerald-100">
                Integre a base Millenium ao OpenAI ChatGPT com ações personalizadas (OpenAI Actions)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-700">
          
          {/* Card: Credenciais da API */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-emerald-900 text-base flex items-center gap-2">
              <i className="fas fa-key text-emerald-600"></i> Credenciais e URL da API
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Token de Autenticação (Bearer Token)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      localStorage.setItem('MILLENIUM_GPT_API_TOKEN', e.target.value);
                    }}
                    className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => copyToClipboard(token, setCopiedToken)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <i className={`fas ${copiedToken ? 'fa-check' : 'fa-copy'}`}></i>
                    {copiedToken ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Cole este valor no campo <strong>API Key</strong> da autenticação no ChatGPT.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  URL da Especificação OpenAPI (Schema)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={openApiUrl}
                    className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(openApiUrl, setCopiedSchema)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <i className={`fas ${copiedSchema ? 'fa-check' : 'fa-copy'}`}></i>
                    {copiedSchema ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Cole no ChatGPT no botão <strong>"Import from URL"</strong> dentro de Actions.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Passo a Passo no ChatGPT */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <i className="fas fa-list-ol text-blue-600"></i> Passo a Passo para Criar seu Custom GPT
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-gray-900">Acesse o ChatGPT:</strong> Vá em{' '}
                  <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">Explorar GPTs</span> &gt;{' '}
                  <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">+ Criar</span> (Create a GPT).
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-gray-900">Aba "Configure":</strong> Defina um nome como{' '}
                  <em>"Millenium Comercial AI"</em> e adicione a descrição.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-gray-900">Criar a Action:</strong> No final da tela, clique em{' '}
                  <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">Create new action</span>.
                  Clique em <strong>Import from URL</strong> e cole o link do OpenAPI Schema acima (ou clique no link para baixar o arquivo).
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="text-gray-900">Configurar Autenticação com Token:</strong>
                  <ul className="list-disc list-inside mt-1 ml-2 text-gray-600 text-xs space-y-1">
                    <li>Authentication Type: <strong>API Key</strong></li>
                    <li>Auth Type: <strong>Bearer</strong></li>
                    <li>API Key: Cole o <strong>Token</strong> copiado acima (<code>{token}</code>).</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  5
                </span>
                <div>
                  <strong className="text-gray-900">Pronto!</strong> Clique em Salvar e comece a conversar com o GPT fazendo perguntas sobre clientes, representantes e inatividade.
                </div>
              </div>
            </div>
          </div>

          {/* Card: Instruções Recomendadas (System Instructions) */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <i className="fas fa-comment-dots text-purple-600"></i> Instruções do Custom GPT (Prompt para o ChatGPT)
              </h3>
              <button
                onClick={() => copyToClipboard(gptCustomPrompt, setCopiedPrompt)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <i className={`fas ${copiedPrompt ? 'fa-check' : 'fa-copy'}`}></i>
                {copiedPrompt ? 'Copiado!' : 'Copiar Prompt'}
              </button>
            </div>
            <textarea
              readOnly
              rows={6}
              value={gptCustomPrompt}
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-xs font-mono text-gray-700 focus:outline-none"
            />
            <p className="text-[11px] text-gray-500">
              Copie o texto acima e cole no campo <strong>"Instructions"</strong> na configuração do seu Custom GPT.
            </p>
          </div>

          {/* Card: Testador de API em tempo real */}
          <div className="bg-gray-900 text-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <i className="fas fa-terminal text-green-400"></i> Testar API em Tempo Real
            </h3>
            <p className="text-xs text-gray-400">
              Envie uma requisição de teste para verificar se o token e os dados do Supabase estão respondendo corretamente:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={testEndpoint}
                onChange={(e) => setTestEndpoint(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
              >
                <option value="/api/summary">GET /api/summary (Resumo Geral e Totais)</option>
                <option value="/api/clients?limit=5">GET /api/clients?limit=5 (5 Clientes)</option>
                <option value="/api/clients?status=Inativo&limit=5">GET /api/clients?status=Inativo&limit=5</option>
                <option value="/api/representatives">GET /api/representatives (Representantes)</option>
                <option value="/api/cities">GET /api/cities (Cidades)</option>
              </select>
              <button
                onClick={handleTestApi}
                disabled={isTesting}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isTesting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-play"></i>}
                {isTesting ? 'Executando...' : 'Testar Requisição'}
              </button>
            </div>

            {testResult && (
              <div className="mt-3">
                <div className="text-[11px] text-gray-400 mb-1 flex justify-between items-center">
                  <span>Resposta do Servidor (HTTP):</span>
                  <button
                    onClick={() => setTestResult(null)}
                    className="text-gray-400 hover:text-white text-[10px]"
                  >
                    Limpar
                  </button>
                </div>
                <pre className="bg-black/80 text-emerald-400 p-3 rounded-lg text-xs font-mono max-h-48 overflow-y-auto border border-gray-800">
                  {testResult}
                </pre>
              </div>
            )}
          </div>

        </div>

        {/* Rodapé */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GptIntegrationModal;
