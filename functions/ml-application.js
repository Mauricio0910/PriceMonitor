export async function onRequest(context) {
  const { env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (!env.ML_ACCESS_TOKEN) {
    return Response.json(
      { error: "ML_ACCESS_TOKEN não encontrado no Cloudflare." },
      { status: 500, headers: corsHeaders }
    );
  }

  if (!env.ML_CLIENT_ID) {
    return Response.json(
      { error: "ML_CLIENT_ID não encontrado no Cloudflare." },
      { status: 500, headers: corsHeaders }
    );
  }

  const endpoint =
    "https://api.mercadolibre.com/applications/" +
    encodeURIComponent(env.ML_CLIENT_ID);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer " + env.ML_ACCESS_TOKEN
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
