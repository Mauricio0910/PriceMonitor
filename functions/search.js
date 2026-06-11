// Força novo deploy Cloudflare Pages
export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const marketplace = url.searchParams.get("marketplace") || "todos";

    if (!query.trim()) {
      return Response.json(
        {
          error: "Informe o parâmetro q com o nome do produto."
        },
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const results = [];

    async function searchMercadoLivre() {
      const endpoint =
        "https://api.mercadolibre.com/sites/MLB/search?q=" +
        encodeURIComponent(query);

      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Erro ao consultar Mercado Livre");
      }

      const data = await response.json();

      return (data.results || []).slice(0, 10).map((item) => ({
        marketplace: "Mercado Livre",
        title: item.title || "",
        price: Number(item.price || 0),
        currency: item.currency_id || "BRL",
        url: item.permalink || "",
        seller: item.seller?.nickname || "",
        thumbnail: item.thumbnail || "",
        source: "api_publica_mercado_livre"
      }));
    }

    if (marketplace === "todos" || marketplace === "mercado_livre") {
      const mercadoLivreResults = await searchMercadoLivre();
      results.push(...mercadoLivreResults);
    }

    if (marketplace === "todos" || marketplace === "amazon") {
      results.push({
        marketplace: "Amazon",
        title: "Integração pendente: exige API oficial/credenciais",
        price: 0,
        currency: "BRL",
        url: "",
        seller: "",
        thumbnail: "",
        source: "pendente_api_oficial"
      });
    }

    if (marketplace === "todos" || marketplace === "shopee") {
      results.push({
        marketplace: "Shopee",
        title: "Integração pendente: exige API oficial/credenciais",
        price: 0,
        currency: "BRL",
        url: "",
        seller: "",
        thumbnail: "",
        source: "pendente_api_oficial"
      });
    }

    if (marketplace === "todos" || marketplace === "shein") {
      results.push({
        marketplace: "SHEIN",
        title: "Integração pendente: exige API oficial/credenciais",
        price: 0,
        currency: "BRL",
        url: "",
        seller: "",
        thumbnail: "",
        source: "pendente_api_oficial"
      });
    }

    return Response.json(
      {
        query,
        marketplace,
        count: results.length,
        results
      },
      {
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Erro inesperado ao consultar preços."
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
