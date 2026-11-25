import { applyCorsHeaders } from './_lib/auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Detectar host dinâmico para que o OpenAI Custom GPT saiba exatamente o domínio
    const host = req.headers?.host || 'millenium-curva-abc.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Ler schema base
    const schemaPath = path.join(process.cwd(), 'public', 'openapi.json');
    let schemaText = '';
    
    if (fs.existsSync(schemaPath)) {
      schemaText = fs.readFileSync(schemaPath, 'utf-8');
    }

    if (!schemaText) {
      return res.status(500).json({ error: 'Arquivo openapi.json não encontrado.' });
    }

    const schema = JSON.parse(schemaText);
    schema.servers = [
      {
        url: baseUrl,
        description: 'Servidor Atual (Detectado Automaticamente)'
      }
    ];

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(schema);
  } catch (error: any) {
    console.error('Erro na rota /api/openapi:', error);
    return res.status(500).json({ error: 'Erro ao gerar especificação OpenAPI.' });
  }
}
