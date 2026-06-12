export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

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

  return Response.json(
    {
      ok: true,
      message: "Função /search publicada com sucesso",
      q: url.searchParams.get("q"),
      marketplace: url.searchParams.get("marketplace")
    },
    {
      status: 200,
      headers: corsHeaders
    }
  );
}
