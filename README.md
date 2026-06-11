# PriceMonitor - versão simples para GitHub Pages

Esta é a versão mais simples do sistema:

- Hospedagem: GitHub Pages
- Banco de dados: Cloud Firestore
- Login/senha: Firebase Authentication
- Frontend: arquivo único `index.html`

## Como publicar

1. No GitHub, abra o repositório `PriceMonitor`.
2. Apague os arquivos antigos ou crie um repositório novo.
3. Envie estes arquivos para a raiz do repositório:
   - `index.html`
   - `404.html`
   - `.nojekyll`
4. Em `Settings > Pages`, use:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Abra:
   - `https://mauricio0910.github.io/PriceMonitor/`

## Firebase

No Firebase Console:

1. Ative Authentication > Sign-in method > Email/Password.
2. Crie o Cloud Firestore.
3. Cole o conteúdo de `firestore.rules` em Firestore Database > Rules.
4. Em Authentication > Settings > Authorized domains, adicione:
   - `mauricio0910.github.io`

## Observação

A chave Firebase Web SDK é pública por natureza. A proteção do sistema fica nas regras do Firestore e no login do Firebase Authentication.


## Atualização

Esta versão inclui a opção `Todos os marketplaces` e campo opcional para informar um servidor/API proxy de preços.

Para Amazon, Shopee e SHEIN, veja `README_BACKEND_MARKETPLACES.md` e `cloudflare-worker-marketplaces.js`.
