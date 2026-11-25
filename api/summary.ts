import { validateApiToken, applyCorsHeaders } from './_lib/auth.js';
import { fetchSummaryFromDb } from './_lib/supabase.js';

export default async function handler(req: any, res: any) {
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validar Token
  const auth = validateApiToken(req);
  if (!auth.isValid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const summary = await fetchSummaryFromDb();
    return res.status(200).json(summary);
  } catch (error: any) {
    console.error('Erro na API /api/summary:', error);
    return res.status(500).json({
      error: 'Erro interno ao gerar resumo.',
      details: error.message || error
    });
  }
}
