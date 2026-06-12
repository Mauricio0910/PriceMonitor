export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  const sellerId = url.searchParams.get("seller_id");

  if (!sellerId) {
    return Response.json(
      {
        error: "Informe seller_id. Exemplo: /ml-public-seller?seller_id=123456789"
      },
      {
        status: 400,
        headers: corsHeaders
      }
    );
  }

  const endpoint =
    "https://api.mercadolibre.com/sites/MLB/search?seller_id=" +
    encodeURIComponent(sellerId) +
    "&limit=10";

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
