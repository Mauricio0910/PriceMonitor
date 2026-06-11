// Cloudflare Worker para usar como API proxy de preços.
// Publicar em Cloudflare Workers e informar a URL no campo "Servidor de consulta" do PriceMonitor.
// Endpoint esperado pelo sistema:
//   GET https://seu-worker.workers.dev/search?marketplace=mercado_livre&q=produto&limit=10
//
// Para Amazon, Shopee e SHEIN, implemente as APIs oficiais dentro das funções abaixo,
// usando secrets/env vars do Cloudflare para guardar tokens e chaves.

const ALLOWED_ORIGINS = [
  'https://mauricio0910.github.io',
  'http://localhost:3000'
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request)
  });
}

async function searchMercadoLivre(q, limit) {
  const url = new URL('https://api.mercadolibre.com/sites/MLB/search');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit || 10));
  url.searchParams.set('sort', 'price_asc');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PriceMonitor/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Mercado Livre HTTP ${response.status}`);
  }

  const data = await response.json();

  return (data.results || []).map(item => ({
    marketplace: 'mercado_livre',
    title: item.title || '',
    seller: item.seller?.nickname || '',
    price: Number(item.price || 0),
    shipping: item.shipping?.free_shipping ? 0 : null,
    currency: item.currency_id || 'BRL',
    url: item.permalink || '',
    score: 0
  }));
}

async function searchAmazon(q, limit, env) {
  // Implementar aqui usando API oficial/contratada.
  // Nunca coloque Access Key/Secret dentro do index.html.
  // Use env.AMAZON_ACCESS_KEY, env.AMAZON_SECRET_KEY, etc.
  throw new Error('Amazon exige integração oficial no backend/proxy.');
}

async function searchShopee(q, limit, env) {
  // Implementar aqui usando Shopee Open Platform.
  // Use env.SHOPEE_PARTNER_ID, env.SHOPEE_PARTNER_KEY, access tokens, etc.
  throw new Error('Shopee exige integração oficial no backend/proxy.');
}

async function searchShein(q, limit, env) {
  // Implementar aqui usando SHEIN Open Platform.
  // Use env.SHEIN_APP_ID, env.SHEIN_APP_SECRET, tokens, etc.
  throw new Error('SHEIN exige integração oficial no backend/proxy.');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname !== '/search') {
        return json(request, { error: 'Use /search?marketplace=mercado_livre&q=produto' }, 404);
      }

      const marketplace = url.searchParams.get('marketplace') || 'mercado_livre';
      const q = (url.searchParams.get('q') || '').trim();
      const limit = Math.min(Number(url.searchParams.get('limit') || 10), 20);

      if (!q) {
        return json(request, { error: 'Informe q' }, 400);
      }

      let results = [];

      if (marketplace === 'mercado_livre') {
        results = await searchMercadoLivre(q, limit);
      } else if (marketplace === 'amazon') {
        results = await searchAmazon(q, limit, env);
      } else if (marketplace === 'shopee') {
        results = await searchShopee(q, limit, env);
      } else if (marketplace === 'shein') {
        results = await searchShein(q, limit, env);
      } else {
        return json(request, { error: 'Marketplace inválido' }, 400);
      }

      return json(request, { marketplace, query: q, results });
    } catch (error) {
      return json(request, { error: error.message }, 500);
    }
  }
};
