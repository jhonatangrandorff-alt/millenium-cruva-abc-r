import { validateApiToken, applyCorsHeaders } from './_lib/auth.js';
import { fetchCitiesAggregated } from './_lib/supabase.js';

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
    const cities = await fetchCitiesAggregated();
    return res.status(200).json({
      totalCidades: cities.length,
      cidades: cities
    });
  } catch (error: any) {
    console.error('Erro na API /api/cities:', error);
    return res.status(500).json({
      error: 'Erro interno ao buscar cidades.',
      details: error.message || error
    });
  }
}
