# Binance API Monorepo

Projeto com backend PHP para integracao com Binance e Coinbase.

## Estrutura

- `api/`: API REST em PHP (principal).
- `web/`: pasta reservada para frontend (atualmente vazia).

## Status atual

- API com rotas para Binance e Coinbase.
- Testes unitarios extensos no backend.
- Sem README original no repo (este arquivo e inicial).
- Frontend ainda nao implementado neste repositorio.

## Stack (API)

- PHP >= 8.1
- Composer
- cURL/JSON/OpenSSL
- PHPUnit (dev)
- PHPStan (dev)

Arquivos principais:

- `api/index.php`
- `api/src/Router.php`
- `api/src/Controllers/*`
- `api/src/BinanceClient.php`
- `api/src/CoinbaseClient.php`

## Requisitos

Instale no ambiente local:

1. PHP 8.1+
2. Composer
3. Extensoes PHP:
- `curl`
- `openssl`
- `json`
- `pdo` e `pdo_pgsql` (se usar camada de banco)

## Setup rapido (local)

```bash
cd api
composer install
cp .env.example .env
php -S localhost:8000 -t .
```

Base URL local:

- `http://localhost:8000/api`

## Setup com Docker (API)

```bash
cd api
docker compose up --build -d
```

Base URL Docker:

- `http://localhost:8080/api`

Observacao importante:

- O `api/docker-compose.yml` referencia um servico `front` com `build: ./binance-front`, mas essa pasta nao existe no estado atual do clone.
- Para subir apenas a API, remova/comente o servico `front` ou ajuste o path para um frontend valido.

## Rotas disponiveis

Todas as rotas abaixo usam prefixo `/api`.

### Infra

- `GET /health`
- `GET /metrics` (quando `METRICS_ENABLED=true`)

### Binance - General

- `GET /general/ping`
- `GET /general/time`
- `GET /general/exchange-info`

### Binance - Market

- `GET /market/ticker`
- `GET /market/order-book`
- `GET /market/trades`
- `GET /market/avg-price`
- `GET /market/book-ticker`
- `GET /market/agg-trades`
- `GET /market/klines`
- `GET /market/ui-klines`
- `GET /market/historical-trades`
- `GET /market/rolling-window-ticker`
- `GET /market/ticker-price`
- `GET /market/ticker-24h`

### Binance - Account (privadas)

- `GET /account/info`
- `GET /account/open-orders`
- `GET /account/order-history`
- `GET /account/balance`
- `GET /account/my-trades`
- `GET /account/account-status`
- `GET /account/api-trading-status`
- `GET /account/capital-config`
- `POST /account/dust-transfer`
- `GET /account/asset-dividend`
- `GET /account/convert-transferable`
- `GET /account/p2p-orders`

### Binance - Trading (privadas)

- `POST /trading/create-order`
- `DELETE /trading/cancel-order`
- `POST /trading/test-order`
- `GET /trading/query-order`
- `DELETE /trading/cancel-open-orders`
- `POST /trading/create-oco`
- `GET /trading/list-oco`
- `DELETE /trading/cancel-oco`
- `GET /trading/order-rate-limit`
- `GET /trading/commission-rate`
- `POST /trading/cancel-replace`

### Coinbase - General

- `GET /coinbase/general/ping`
- `GET /coinbase/general/time`

### Coinbase - Market

- `GET /coinbase/market/products`
- `GET /coinbase/market/product`
- `GET /coinbase/market/product-book`
- `GET /coinbase/market/ticker`
- `GET /coinbase/market/candles`

### Coinbase - Account (privadas)

- `GET /coinbase/account/accounts`
- `GET /coinbase/account/account`

### Coinbase - Trading (privadas)

- `POST /coinbase/trading/create-order`
- `POST /coinbase/trading/cancel-order`
- `GET /coinbase/trading/get-order`
- `GET /coinbase/trading/list-orders`

## Padrao de resposta

Sucesso:

```json
{
  "success": true,
  "data": {}
}
```

Erro:

```json
{
  "success": false,
  "error": "mensagem"
}
```

## Autenticacao e seguranca

- Basic Auth global opcional via `.env`:
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`
- Rotas privadas exigem credenciais da exchange (Binance/Coinbase).

## Variaveis de ambiente importantes

Veja `api/.env.example`.

Principais:

- Binance: `BINANCE_API_KEY`, `BINANCE_SECRET_KEY`
- Coinbase: `COINBASE_API_KEY`, `COINBASE_API_SECRET`, `COINBASE_KEY_FILE`
- Rate limit: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`
- Logs: `APP_LOG_FILE`, `APP_DEBUG`
- Metrics: `METRICS_ENABLED`

## Testes e qualidade (API)

```bash
cd api
composer test
composer stan
```

## Colecao Insomnia

- `api/insomnia.json`

## Banco de dados (status)

Existe camada de banco em:

- `api/src/Database/*`
- `api/sql/*`

No estado atual, essa camada esta disponivel no codigo, mas nao e o fluxo principal das rotas da API.

## Proximos passos sugeridos

1. Ajustar `api/docker-compose.yml` para subir somente servicos existentes.
2. Criar frontend dentro de `web/` (ou apontar compose para projeto frontend real).
3. Adicionar autenticacao de aplicacao (alem das chaves de exchange), se necessario para producao.
4. Documentar exemplos de request/response por endpoint em uma seccao de API reference.
