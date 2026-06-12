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
    const sellerIdParam = url.searchParams.get("seller_id") || "";

    if (marketplace !== "mercado_livre" && marketplace !== "todos") {
      return Response.json(
        {
          query,
          marketplace,
          count: 0,
          results: [],
          warnings: [
            "Esta função está configurada apenas para Mercado Livre."
          ]
        },
        {
          status: 200,
          headers: corsHeaders
        }
      );
    }

    if (!env.ML_ACCESS_TOKEN) {
      throw new Error("ML_ACCESS_TOKEN não encontrado no Cloudflare.");
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

    function normalizeItem(item, sellerName = "") {
      const title = item.title || "";
      const sellerSku =
        item.seller_custom_field ||
        item.attributes?.find((attr) => attr.id === "SELLER_SKU")?.value_name ||
        "";

      return {
        marketplace: "Mercado Livre",
        title,
        price: Number(item.price || 0),
        currency: item.currency_id || "BRL",
        url: item.permalink || "",
        seller: sellerName,
        thumbnail: item.thumbnail || "",
        itemId: item.id || "",
        sku: sellerSku,
        status: item.status || "",
        source: "mercado_livre_endpoint_documentado"
      };
    }

    function matchesQuery(item) {
      if (!query) return true;

      const textForSearch = [
        item.title,
        item.sku,
        item.itemId,
        item.url
      ]
        .join(" ")
        .toLowerCase();

      return textForSearch.includes(query);
    }

    async function searchOwnSellerItems() {
      // 1. Usuário autenticado
      const me = await mlGet("https://api.mercadolibre.com/users/me");

      if (!me.id) {
        throw new Error("Não foi possível identificar o usuário autenticado.");
      }

      // 2. Lista anúncios próprios
      const listUrl =
        "https://api.mercadolibre.com/users/" +
        encodeURIComponent(String(me.id)) +
        "/items/search?status=active&limit=" +
        encodeURIComponent(String(limit));

      const itemList = await mlGet(listUrl);
      const itemIds = itemList.results || [];

      if (!itemIds.length) {
        return {
          seller: {
            id: me.id,
            nickname: me.nickname || ""
          },
          results: []
        };
      }

      // 3. Consulta detalhes/preços em lote
      const ids = itemIds.slice(0, limit).join(",");

      const detailsUrl =
        "https://api.mercadolibre.com/items?ids=" +
        encodeURIComponent(ids) +
        "&attributes=id,title,price,currency_id,permalink,thumbnail,status,seller_custom_field,attributes";

      const details = await mlGet(detailsUrl);

      const results = (details || [])
        .filter((row) => row.code === 200 && row.body)
        .map((row) => normalizeItem(row.body, me.nickname || ""))
        .filter((item) => item.price > 0)
        .filter(matchesQuery);

      return {
        seller: {
          id: me.id,
          nickname: me.nickname || ""
        },
        results
      };
    }

    async function searchPublicSellerItems(sellerId) {
      // Listagem pública por seller_id, conforme orientação do Mercado Livre
      const searchUrl =
        "https://api.mercadolibre.com/sites/MLB/search?seller_id=" +
        encodeURIComponent(String(sellerId)) +
        "&limit=" +
        encodeURIComponent(String(limit));

      const data = await mlGet(searchUrl);

      const results = (data.results || [])
        .map((item) => normalizeItem(item, String(sellerId)))
        .filter((item) => item.price > 0)
        .filter(matchesQuery);

      return {
        seller: {
          id: sellerId,
          nickname: String(sellerId)
        },
        results
      };
    }

    let sellerInfo = null;
    let results = [];
    const warnings = [];

    if (sellerIdParam) {
      const sellerSearch = await searchPublicSellerItems(sellerIdParam);
      sellerInfo = sellerSearch.seller;
      results = sellerSearch.results;

      warnings.push(
        "Consulta feita por seller_id específico usando endpoint documentado pelo Mercado Livre."
      );
    } else {
      const ownSearch = await searchOwnSellerItems();
      sellerInfo = ownSearch.seller;
      results = ownSearch.results;

      warnings.push(
        "Consulta limitada aos anúncios próprios do usuário autenticado."
      );
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
        seller: sellerInfo,
        count: results.length,
        results,
        warnings,
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
