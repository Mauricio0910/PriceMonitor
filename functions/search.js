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
    const limit = Number(url.searchParams.get("limit") || 10);

    if (!query.trim()) {
      return Response.json(
        { error: "Informe o parâmetro q com o nome do produto." },
        { status: 400, headers: corsHeaders }
      );
    }

    const results = [];
    const warnings = [];

    async function searchMercadoLivre() {
      const endpoint =
        "https://api.mercadolibre.com/sites/MLB/search?q=" +
        encodeURIComponent(query) +
        "&limit=" +
        encodeURIComponent(String(limit));

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
        }
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          "Mercado Livre retornou HTTP " +
            response.status +
            " - " +
            responseText.slice(0, 500)
        );
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(
          "Mercado Livre retornou resposta inválida: " +
            responseText.slice(0, 300)
        );
      }

      return (data.results || [])
        .map((item) => ({
          marketplace: "Mercado Livre",
          title: item.title || "",
          price: Number(item.price || 0),
          currency: item.currency_id || "BRL",
          url: item.permalink || "",
          seller: item.seller?.nickname || "",
          thumbnail: item.thumbnail || "",
          source: "api_publica_mercado_livre"
        }))
        .filter((item) => item.price > 0);
    }

    if (marketplace === "todos" || marketplace === "mercado_livre") {
      const mercadoLivreResults = await searchMercadoLivre();
      results.push(...mercadoLivreResults);
    }

    if (marketplace === "todos" || marketplace === "amazon") {
      warnings.push("Amazon: integração pendente de API oficial/credenciais.");
    }

    if (marketplace === "todos" || marketplace === "shopee") {
      warnings.push("Shopee: integração pendente de API oficial/credenciais.");
    }

    if (marketplace === "todos" || marketplace === "shein") {
      warnings.push("SHEIN: integração pendente de API oficial/credenciais.");
    }

    const prices = results
      .map((item) => item.price)
      .filter((price) => Number.isFinite(price) && price > 0);

    const priceAnalysis =
      prices.length > 0
        ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: Number(
              (
                prices.reduce((sum, price) => sum + price, 0) / prices.length
              ).toFixed(2)
            )
          }
        : null;

    return Response.json(
      {
        query,
        marketplace,
        count: results.length,
        results,
        warnings,
        priceAnalysis
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Erro inesperado ao consultar preços."
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
