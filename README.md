# Klaro Finance

Aplicacao Vue + Express preparada para deploy unico no Coolify.

## Desenvolvimento

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:54017`
- API: `http://127.0.0.1:54018`

Login demo:

- Email: `demo@klaro.app`
- PIN: `1234`

## Producao local

```bash
npm install
npm run build
PORT=3000 SESSION_SECRET=troque-isto npm run start
```

Em producao, o Express serve os arquivos de `dist` e responde tambem pelas rotas `/api/*`.

## Deploy no Coolify

Use o diretório `klaro-finances` como raiz do projeto no serviço.

### Opcao recomendada: Dockerfile

- Build pack: `Dockerfile`
- Port: `3000`
- Health check: `/api/health`
- Publish directory: nao usar
- Build command: nao usar
- Start command: nao usar

Variaveis de ambiente:

- `PORT=3000`
- `SESSION_SECRET=<segredo-forte>`
- `DATA_DIR=/app/data`

Persistencia:

- Monte um volume em `/app/data`

### Observacoes

- Sem volume persistente, o SQLite reinicia a cada novo deploy.
- O cookie de sessao usa `secure` em producao; rode atras de HTTPS, que e o padrao no Coolify.
- Se o deploy estiver em branco, confirme que o Coolify esta usando o `Dockerfile` desta pasta e nao o modo Nixpacks/Node.
