# Como fazer a pesquisa online funcionar com segurança

O GitHub Pages roda somente HTML/CSS/JavaScript no navegador. Ele não é lugar seguro para chaves de API, tokens ou secrets.

Para pesquisar marketplaces que exigem autenticação, use um pequeno servidor/API proxy.

## Fluxo recomendado

GitHub Pages -> Cloudflare Worker -> APIs oficiais dos marketplaces -> Firestore

## Por que usar proxy?

- Protege tokens de Amazon, Shopee e SHEIN.
- Evita expor app secret no index.html.
- Ajuda a tratar CORS.
- Padroniza a resposta para o PriceMonitor.

## Como usar no PriceMonitor

1. Publique o arquivo `cloudflare-worker-marketplaces.js` em Cloudflare Workers.
2. Copie a URL do Worker, por exemplo:
   `https://price-monitor.seuusuario.workers.dev/search`
3. Abra o PriceMonitor.
4. Vá em `Consulta de preços sugeridos`.
5. Cole a URL no campo `Servidor de consulta de preços/API proxy`.
6. Clique em `Salvar servidor`.

## Estrutura de resposta esperada

```json
{
  "results": [
    {
      "marketplace": "mercado_livre",
      "title": "Produto exemplo",
      "seller": "Loja",
      "price": 99.9,
      "shipping": 0,
      "currency": "BRL",
      "url": "https://...",
      "score": 0.9
    }
  ]
}
```

## Importante

O exemplo já consulta Mercado Livre pelo Worker. Amazon, Shopee e SHEIN precisam de implementação usando APIs oficiais, tokens e autorizações de cada plataforma.
