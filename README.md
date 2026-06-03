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

### Opcao recomendada: Docker Compose

Arquitetura:

- `web`: Nginx servindo o frontend em `80`
- `api`: Node/Express servindo a API em `3000` na rede interna

Arquivos:

- `docker-compose.yml`
- `Dockerfile.nginx`
- `Dockerfile.api`
- `nginx/default.conf`

No Coolify:

- Build pack: `Docker Compose`
- Compose file: `docker-compose.yml`
- Service publicado: `web`
- Port: `80`
- Health check: `/healthz`
- Sem `ports` binding no compose; o Coolify publica o service diretamente

Variaveis de ambiente:

- `SESSION_SECRET=<segredo-forte>`
- `PORT=3000` para a API
- `DATA_DIR=/app/data`

Persistencia:

- Monte um volume em `/app/data` no service `api`

### Observacoes

- Sem volume persistente, o SQLite reinicia a cada novo deploy.
- O cookie de sessao usa `secure` em producao; rode atras de HTTPS, que e o padrao no Coolify.
- Se o deploy estiver em branco, confirme que o Coolify esta publicando o service `web` e nao o `api`.
