import { validateApiToken, applyCorsHeaders } from './_lib/auth.js';
import { fetchClientsFromDb } from './_lib/supabase.js';

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
    const filters = {
      search: req.query.search,
      status: req.query.status,
      abc: req.query.abc,
      representative: req.query.representative,
      supervisor: req.query.supervisor,
      city: req.query.city,
      state: req.query.state,
      minDays: req.query.minDays ? Number(req.query.minDays) : undefined,
      maxDays: req.query.maxDays ? Number(req.query.maxDays) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      sortBy: req.query.sortBy || 'daysSincePurchase',
      sortOrder: (req.query.sortOrder || 'desc') as 'asc' | 'desc'
    };

    const result = await fetchClientsFromDb(filters);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro na API /api/clients:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar clientes.',
      details: error.message || error
    });
  }
}
