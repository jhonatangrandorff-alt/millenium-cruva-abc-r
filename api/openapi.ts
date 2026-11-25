import { applyCorsHeaders } from './_lib/auth.js';

export default async function handler(req: any, res: any) {
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const host = req.headers?.host || 'millenium-curva-abc.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const schema = {
      openapi: "3.1.0",
      info: {
        title: "API Millenium - Gestão de Clientes e Curva ABC",
        description: "API completa para o ChatGPT consultar em tempo real a carteira de clientes, status (Ativo, Semi-Ativo, Inativo), Curva ABC (A: até 30 dias, B: 31 a 90 dias, C: mais de 90 dias sem comprar), representantes, supervisores e cidades da Millenium.",
        version: "1.0.0"
      },
      servers: [
        {
          url: baseUrl,
          description: "Servidor Atual"
        }
      ],
      security: [
        {
          bearerAuth: []
        }
      ],
      paths: {
        "/api/summary": {
          get: {
            operationId: "obterResumoGeral",
            summary: "Resumo geral da base de clientes e indicadores de desempenho",
            description: "Retorna métricas consolidadas: total geral de clientes, quantidade e percentual de clientes ativos, semi-ativos e inativos, contagem por faixa da Curva ABC (A, B e C), total de representantes, cidades atendidas e desempenho por setor de supervisão.",
            responses: {
              "200": {
                description: "Resumo retornado com sucesso"
              },
              "401": {
                description: "Token inválido ou ausente"
              }
            }
          }
        },
        "/api/clients": {
          get: {
            operationId: "consultarClientes",
            summary: "Consultar e filtrar lista detalhada de clientes",
            description: "Permite buscar clientes aplicando filtros: termo de busca, status (Ativo, Semi-Ativo, Inativo), curva ABC (A, B, C), representante comercial, supervisor, cidade, estado e intervalo de dias sem comprar (minDays e maxDays).",
            parameters: [
              { name: "search", in: "query", schema: { type: "string" } },
              { name: "status", in: "query", schema: { type: "string", enum: ["Ativo", "Semi-Ativo", "Inativo"] } },
              { name: "abc", in: "query", schema: { type: "string", enum: ["A", "B", "C"] } },
              { name: "representative", in: "query", schema: { type: "string" } },
              { name: "supervisor", in: "query", schema: { type: "string" } },
              { name: "city", in: "query", schema: { type: "string" } },
              { name: "state", in: "query", schema: { type: "string" } },
              { name: "minDays", in: "query", schema: { type: "integer" } },
              { name: "maxDays", in: "query", schema: { type: "integer" } },
              { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
              { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
              { name: "sortBy", in: "query", schema: { type: "string", default: "daysSincePurchase" } },
              { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } }
            ],
            responses: {
              "200": {
                description: "Lista de clientes filtrada com metadados de paginação"
              },
              "401": {
                description: "Token inválido ou ausente"
              }
            }
          }
        },
        "/api/representatives": {
          get: {
            operationId: "listarRepresentantes",
            summary: "Obter estatísticas e carteira por representante",
            description: "Retorna cada representante comercial com total de clientes na sua carteira, contagem de ativos, semi-ativos e inativos, distribuição da Curva ABC e número de cidades atendidas.",
            responses: {
              "200": {
                description: "Lista de representantes retornada"
              }
            }
          }
        },
        "/api/cities": {
          get: {
            operationId: "listarCidades",
            summary: "Obter dados consolidados por cidade",
            description: "Retorna cidades com total de clientes, divisão por status (ativos, semi-ativos, inativos), curva ABC e lista de representantes atuando no município.",
            responses: {
              "200": {
                description: "Lista de cidades retornada"
              }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "API Token",
            description: "Informe o Token de API fornecido nas configurações do sistema Millenium."
          }
        }
      }
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(schema);
  } catch (error: any) {
    console.error('Erro na rota /api/openapi:', error);
    return res.status(500).json({ error: 'Erro ao gerar especificação OpenAPI.' });
  }
}
