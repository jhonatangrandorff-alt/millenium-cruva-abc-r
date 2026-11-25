import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import url from 'url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !req.url.startsWith('/api/')) {
            return next();
          }

          const parsedUrl = url.parse(req.url, true);
          const pathname = parsedUrl.pathname || '';
          const route = pathname.replace(/^\/api\//, '').replace(/\.json$/, '');

          // Enriquecer req e res com métodos padrão (compatibilidade Vercel/Express)
          (req as any).query = parsedUrl.query;
          (res as any).status = function (code: number) {
            res.statusCode = code;
            return res;
          };
          (res as any).json = function (data: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          try {
            const validRoutes = ['clients', 'summary', 'representatives', 'cities', 'openapi'];
            if (validRoutes.includes(route)) {
              const mod = await server.ssrLoadModule(`./api/${route}.ts`);
              const handler = mod.default;
              return await handler(req, res);
            } else {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Rota de API /api/${route} não encontrada.` }));
            }
          } catch (err: any) {
            console.error('Erro no middleware da API local:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Erro interno na API local', details: err.message || err }));
          }
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
  }
});
