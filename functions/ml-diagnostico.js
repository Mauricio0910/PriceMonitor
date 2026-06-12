export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  const envCheck = {
    ML_CLIENT_ID: Boolean(env.ML_CLIENT_ID),
    ML_ACCESS_TOKEN: Boolean(env.ML_ACCESS_TOKEN),
    ML_REFRESH_TOKEN: Boolean(env.ML_REFRESH_TOKEN),
    ML_CLIENT_SECRET: Boolean(env.ML_CLIENT_SECRET)
  };

  if (!env.ML_ACCESS_TOKEN || !env.ML_CLIENT_ID) {
    return Response.json(
      {
        error: "Variáveis obrigatórias não encontradas no Cloudflare.",
        envCheck
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }

  const headers = {
    "Accept": "application/json",
    "Authorization": "Bearer " + env.ML_ACCESS_TOKEN
  };

  async function callMercadoLivre(label, endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers
      });

      const text = await response.text();

      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text.slice(0, 500);
      }

      return {
        label,
        endpoint,
        status: response.status,
        ok: response.ok,
        body
      };
    } catch (error) {
      return {
        label,
        endpoint,
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }

  const results = [];

  // 1. Testa dados da aplicação
  results.push(
    await callMercadoLivre(
      "Dados da aplicação",
      "https://api.mercadolibre.com/applications/" +
        encodeURIComponent(env.ML_CLIENT_ID)
    )
  );

  // 2. Testa usuário autenticado
  const meResult = await callMercadoLivre(
    "Usuário autenticado",
    "https://api.mercadolibre.com/users/me"
  );

  results.push(meResult);

  // 3. Se /users/me funcionar, testa anúncios próprios
  const userId = meResult?.body?.id;

  if (userId) {
    results.push(
      await callMercadoLivre(
        "Listar anúncios próprios",
        "https://api.mercadolibre.com/users/" +
          encodeURIComponent(String(userId)) +
          "/items/search?status=active&limit=5"
      )
    );
  }

  // 4. Se informar seller_id na URL, testa seller público
  const sellerId = url.searchParams.get("seller_id");

  if (sellerId) {
    results.push(
      await callMercadoLivre(
        "Listagem pública por seller_id",
        "https://api.mercadolibre.com/sites/MLB/search?seller_id=" +
          encodeURIComponent(sellerId) +
          "&limit=5"
      )
    );
  }

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      aviso: "Diagnóstico temporário. Apague este arquivo depois do teste.",
      envCheck,
      appId: env.ML_CLIENT_ID,
      results
    },
    {
      status: 200,
      headers: corsHeaders
    }
  );
}
