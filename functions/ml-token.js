export async function onRequest(context) {
  const { request, env } = context;

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

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return Response.json(
        {
          error: "Informe o parâmetro code."
        },
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const redirectUri = "https://renpricemonitor1.pages.dev/";

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("client_id", env.ML_CLIENT_ID);
    body.set("client_secret", env.ML_CLIENT_SECRET);
    body.set("code", code);
    body.set("redirect_uri", redirectUri);

    const response = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const responseText = await response.text();

    if (!response.ok) {
      return Response.json(
        {
          error: "Erro ao gerar token",
          status: response.status,
          details: responseText
        },
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    const data = JSON.parse(responseText);

    return Response.json(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        user_id: data.user_id,
        scope: data.scope,
        aviso: "Copie access_token e refresh_token para o Cloudflare. Depois apague este arquivo ml-token.js."
      },
      {
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Erro inesperado ao gerar token."
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
