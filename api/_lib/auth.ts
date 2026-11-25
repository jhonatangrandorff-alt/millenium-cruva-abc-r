// Utilitário de autenticação por Token para a API do ChatGPT / Custom GPT Actions
export const DEFAULT_API_TOKEN = process.env.GPT_API_TOKEN || process.env.API_TOKEN || 'millenium_ai_token_2026';

export interface AuthValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateApiToken(req: any): AuthValidationResult {
  // Obter token do header Authorization: Bearer <TOKEN> ou x-api-key
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const apiKeyHeader = req.headers?.['x-api-key'] || req.headers?.['X-API-KEY'];
  
  let incomingToken: string | null = null;

  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
      incomingToken = authHeader.substring(7).trim();
    } else {
      incomingToken = authHeader.trim();
    }
  } else if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    incomingToken = apiKeyHeader.trim();
  } else if (req.query?.token && typeof req.query.token === 'string') {
    incomingToken = req.query.token.trim();
  }

  const expectedToken = process.env.GPT_API_TOKEN || process.env.API_TOKEN || DEFAULT_API_TOKEN;

  if (!incomingToken) {
    return {
      isValid: false,
      error: 'Token de autenticação não fornecido. Use o header "Authorization: Bearer <SEU_TOKEN>" ou "x-api-key: <SEU_TOKEN>".'
    };
  }

  // Permitir o token configurado ou tokens padrão aceitos
  const validTokens = [expectedToken, 'millenium_ai_token_2026', 'millenium_gpt_token_2026'].filter(Boolean);

  if (!validTokens.includes(incomingToken)) {
    return {
      isValid: false,
      error: 'Token de autenticação inválido.'
    };
  }

  return { isValid: true };
}

export function applyCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
}
