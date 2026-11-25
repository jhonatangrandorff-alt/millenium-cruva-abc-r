import { validateApiToken, applyCorsHeaders } from './_lib/auth.js';
import { fetchRepresentativesAggregated } from './_lib/supabase.js';

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
    const reps = await fetchRepresentativesAggregated();
    return res.status(200).json({
      totalRepresentantes: reps.length,
      representantes: reps
    });
  } catch (error: any) {
    console.error('Erro na API /api/representatives:', error);
    return res.status(500).json({
      error: 'Erro interno ao buscar representantes.',
      details: error.message || error
    });
  }
}
