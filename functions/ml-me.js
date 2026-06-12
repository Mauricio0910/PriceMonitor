export async function onRequest(context) {
  const { env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (!env.ML_ACCESS_TOKEN) {
    return Response.json(
      { error: "ML_ACCESS_TOKEN não encontrado." },
      { status: 500, headers: corsHeaders }
    );
  }

  const response = await fetch("https://api.mercadolibre.com/users/me", {
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
