export async function onRequest(context) {
  const { request, env } = context;

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
    const query = (url.searchParams.get("q") || "").toLowerCase().trim();
    const marketplace = url.searchParams.get("marketplace") || "mercado_livre";
    const limit = Number(url.searchParams.get("limit") || 20);

    if (!env.ML_ACCESS_TOKEN) {
      throw new Error("ML_ACCESS_TOKEN não encontrado no Cloudflare.");
    }

    if (marketplace !== "mercado_livre" && marketplace !== "todos") {
      return Response.json(
        {
          query,
          marketplace,
          count: 0,
          results: [],
          warnings: [
            "Esta versão segura consulta apenas anúncios próprios do Mercado Livre."
          ]
        },
        {
          status: 200,
          headers: corsHeaders
        }
      );
    }

    const mlHeaders = {
      "Accept": "application/json",
      "Authorization": "Bearer " + env.ML_ACCESS_TOKEN
    };

    async function mlGet(endpoint) {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: mlHeaders
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          "Mercado Livre retornou HTTP " +
            response.status +
            " - " +
            text.slice(0, 500)
        );
      }

      return JSON.parse(text);
    }

    // 1. Descobre o vendedor autenticado
    const me = await mlGet("https://api.mercadolibre.com/users/me");
    const userId = me.id;

    if (!userId) {
      throw new Error("Não foi possível identificar o user_id do vendedor.");
    }

    // 2. Lista somente anúncios próprios do vendedor
    const listUrl =
      "https://api.mercadolibre.com/users/" +
      encodeURIComponent(String(userId)) +
      "/items/search?status=active&limit=" +
      encodeURIComponent(String(limit));

    const itemList = await mlGet(listUrl);
    const itemIds = itemList.results || [];

    // 3. Consulta detalhes dos próprios anúncios
    const results = [];

    for (const itemId of itemIds.slice(0, limit)) {
      const item = await mlGet(
        "https://api.mercadolibre.com/items/" +
          encodeURIComponent(itemId)
      );

      const title = item.title || "";
      const sellerSku =
        item.seller_custom_field ||
        item.attributes?.find((a) => a.id === "SELLER_SKU")?.value_name ||
        "";

      const textForSearch = [
        title,
        sellerSku,
        item.id,
        item.permalink
      ]
        .join(" ")
        .toLowerCase();

      // Se o usuário informou busca, filtra dentro dos próprios anúncios
      if (query && !textForSearch.includes(query)) {
        continue;
      }

      results.push({
        marketplace: "Mercado Livre",
        title,
        price: Number(item.price || 0),
        currency: item.currency_id || "BRL",
        url: item.permalink || "",
        seller: me.nickname || "",
        thumbnail: item.thumbnail || "",
        itemId: item.id || "",
        sku: sellerSku,
        status: item.status || "",
        source: "mercado_livre_anuncios_proprios"
      });
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
        seller: {
          id: me.id,
          nickname: me.nickname
        },
        count: results.length,
        results,
        warnings: [
          "Consulta limitada a anúncios próprios do vendedor autenticado."
        ],
        priceAnalysis
      },
      {
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Erro inesperado ao consultar Mercado Livre."
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
