 ---
description: Instruções para a API Binance/Coinbase REST PHP — inclui endpoints, parâmetros, exemplos de request/response e guia de integração front-end.
applyTo: '**/*.{php,js,ts,vue,jsx,tsx,html}'
---
 
# Binance API REST — PHP
 
> Proxy REST que encapsula as APIs da **Binance** e **Coinbase Advanced Trade**, expondo endpoints simplificados com autenticação Basic Auth, rate-limiting, cache e métricas.
 
---
 
## Sumário
 
1. [Visão Geral](#1-visão-geral)
2. [Configuração (.env)](#2-configuração-env)
3. [Autenticação](#3-autenticação)
4. [Padrão de Resposta](#4-padrão-de-resposta)
5. [Endpoints — Binance](#5-endpoints--binance)
   - 5.1 [General](#51-general)
   - 5.2 [Market Data](#52-market-data)
   - 5.3 [Account](#53-account)
   - 5.4 [Trading](#54-trading)
6. [Endpoints — Coinbase](#6-endpoints--coinbase)
   - 6.1 [General](#61-coinbase-general)
   - 6.2 [Market](#62-coinbase-market)
   - 6.3 [Account](#63-coinbase-account)
   - 6.4 [Trading](#64-coinbase-trading)
7. [Endpoints Utilitários](#7-endpoints-utilitários)
8. [Enums & DTOs](#8-enums--dtos)
9. [Rate Limiting](#9-rate-limiting)
10. [Guia de Integração Front-End](#10-guia-de-integração-front-end)
11. [Convenções de Código](#11-convenções-de-código)
 
---
 
## 1. Visão Geral
 
| Item | Valor |
|---|---|
| **Linguagem** | PHP 8.1+ |
| **Entry-point** | `index.php` |
| **Router** | `src/Router.php` |
| **Base URL** | `http://<host>/api` |
| **Content-Type** | `application/json` |
| **Header de correlação** | `X-Correlation-Id` (request) → `X-Request-Id` (response) |
 
A aplicação segue o padrão: `GET|POST|DELETE /api/{section}/{action}?params`
 
---
 
## 2. Configuração (.env)
 
```env
# Binance
BINANCE_API_KEY=your_key
BINANCE_SECRET_KEY=your_secret
BINANCE_TESTNET=false
BINANCE_BASE_URL=https://api.binance.com
BINANCE_RECV_WINDOW=5000
BINANCE_SSL_VERIFY=true
BINANCE_CA_BUNDLE=
 
# Coinbase
COINBASE_API_KEY=your_key
COINBASE_API_SECRET=your_pem_private_key
COINBASE_KEY_FILE=path/to/cdp_api_key.json
COINBASE_BASE_URL=https://api.coinbase.com
COINBASE_SSL_VERIFY=true
COINBASE_CA_BUNDLE=
 
# Auth (protege todas as rotas)
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=secret
 
# Rate Limiting
RATE_LIMIT_ENABLED=true
 
# Métricas
METRICS_ENABLED=true
 
# Cache
CACHE_EXCHANGEINFO_TTL=30
 
# App
APP_ENV=development
APP_DEBUG=false
STORAGE_PATH=./storage
```
 
---
 
## 3. Autenticação
 
### 3.1 Basic Auth (proteção do proxy)
 
Quando `BASIC_AUTH_USER` e `BASIC_AUTH_PASSWORD` estão configurados no `.env`, **todas** as rotas exigem HTTP Basic Auth.
 
```
Authorization: Basic base64(user:password)
```
 
Resposta em caso de falha:
```json
{
  "success": false,
  "error": "Não autorizado"
}
```
**HTTP 401** + header `WWW-Authenticate: Basic realm="Restricted"`
 
### 3.2 Chaves de API (Binance / Coinbase)
 
Endpoints de **Account** e **Trading** exigem `api_key` e `secret_key` (Binance) ou `api_key`/`api_secret`/`key_file` (Coinbase).
 
As chaves podem ser:
- Configuradas no `.env` (valor padrão)
- Enviadas como parâmetros em cada requisição (sobrescreve o `.env`)
 
---
 
## 4. Padrão de Resposta
 
### Sucesso (HTTP 200)
```json
{
  "success": true,
  "data": { ... }
}
```
 
### Sucesso com cache
```json
{
  "success": true,
  "data": { ... },
  "cached": true
}
```
 
### Erro (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": "Mensagem descritiva do erro"
}
```
 
### Erro da Binance propagado
```json
{
  "success": false,
  "error": "mensagem da Binance",
  "code": -1121
}
```
 
> Todo response inclui o header `X-Request-Id`.
 
---
 
## 5. Endpoints — Binance
 
### 5.1 General
 
#### `GET /api/general/ping`
 
Testa conectividade com a API Binance.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| — | — | — | Sem parâmetros |
 
**Exemplo Request:**
```http
GET /api/general/ping
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {}
}
```
 
---
 
#### `GET /api/general/time`
 
Retorna a hora do servidor Binance.
 
**Exemplo Request:**
```http
GET /api/general/time
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "serverTime": 1735000000000
  }
}
```
 
---
 
#### `GET /api/general/exchange-info`
 
Retorna informações de câmbio e símbolos disponíveis. Resultado cacheado por `CACHE_EXCHANGEINFO_TTL` segundos.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | Não | Filtrar por símbolo único (ex: `BTCUSDT`) |
| `symbols` | string/array | Não | Filtrar por múltiplos símbolos |
| `permissions` | string/array | Não | Filtrar por permissão/mercado (ex: `SPOT`) |
| `noCache` | bool | Não | Se `true`, ignora o cache |
 
**Exemplo Request:**
```http
GET /api/general/exchange-info?symbol=BTCUSDT
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "timezone": "UTC",
    "serverTime": 1735000000000,
    "rateLimits": [...],
    "symbols": [
      {
        "symbol": "BTCUSDT",
        "status": "TRADING",
        "baseAsset": "BTC",
        "quoteAsset": "USDT",
        "filters": [...]
      }
    ]
  }
}
```
 
---
 
### 5.2 Market Data
 
#### `GET /api/market/ticker`
 
Retorna ticker 24h de um símbolo (preço, variação, volume).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | **Sim** | Par de negociação (ex: `BTCUSDT`) |
 
**Exemplo Request:**
```http
GET /api/market/ticker?symbol=BTCUSDT
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "price": "95000.50",
    "priceChangePercent": "2.35",
    "high": "96000.00",
    "low": "93000.00",
    "volume": "12345.678"
  }
}
```
 
---
 
#### `GET /api/market/order-book`
 
Retorna o livro de ofertas (depth) de um símbolo.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | **Sim** | Par de negociação |
| `limit` | int | Não | Quantidade de níveis (padrão: `100`). Válidos: 5, 10, 20, 50, 100, 500, 1000, 5000 |
 
**Exemplo Request:**
```http
GET /api/market/order-book?symbol=BTCUSDT&limit=10
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "lastUpdateId": 123456789,
    "bids": [
      ["95000.00", "1.5"],
      ["94999.00", "0.8"]
    ],
    "asks": [
      ["95001.00", "2.0"],
      ["95002.00", "1.2"]
    ]
  }
}
```
 
---
 
#### `GET /api/market/trades`
 
Lista os últimos trades executados para um símbolo.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | **Sim** | Par de negociação |
| `limit` | int | Não | Quantidade (padrão: `500`, máx: 1000) |
 
**Exemplo Request:**
```http
GET /api/market/trades?symbol=ETHUSDT&limit=5
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "price": "3500.00",
      "qty": "0.5",
      "time": 1735000000000,
      "isBuyerMaker": false
    }
  ]
}
```
 
---
 
#### `GET /api/market/historical-trades`
 
Lista trades históricos (requer API Key da Binance).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | **Sim** | Par de negociação |
| `api_key` | string | Não | API Key Binance (usa `.env` se omitido) |
| `limit` | int | Não | Quantidade (padrão: `500`) |
| `fromId` | int | Não | Trade ID inicial |
 
---
 
#### `GET /api/market/avg-price`
 
Retorna o preço médio ponderado (5 minutos).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | **Sim** | Par de negociação |
 
**Exemplo Request:**
```http
GET /api/market/avg-price?symbol=BTCUSDT
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "mins": 5,
    "price": "95000.12345678"
  }
}
```
 
---
 
#### `GET /api/market/book-ticker`
 
Retorna o melhor preço de compra/venda (bid/ask).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | Não | Par específico (omita para todos) |
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "bidPrice": "95000.00",
    "bidQty": "1.5",
    "askPrice": "95001.00",
    "askQty": "2.0"
  }
}
```
 
---
 
#### `GET /api/market/agg-trades`
 
Retorna trades agregados.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | **Sim** | Par de negociação |
| `limit` | int | Não | Quantidade (padrão: `500`) |
| `startTime` | int | Não | Timestamp MS início |
| `endTime` | int | Não | Timestamp MS fim |
| `fromId` | int | Não | Aggregate trade ID inicial |
 
---
 
#### `GET /api/market/klines`
 
Retorna candlesticks (klines).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | **Sim** | Par de negociação |
| `interval` | string | **Sim** | Intervalo: `1s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M` |
| `limit` | int | Não | Quantidade (padrão: `500`, máx: 1000) |
| `startTime` | int | Não | Timestamp MS início |
| `endTime` | int | Não | Timestamp MS fim |
 
**Exemplo Request:**
```http
GET /api/market/klines?symbol=BTCUSDT&interval=1h&limit=3
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": [
    [
      1735000000000,
      "95000.00",
      "96000.00",
      "94500.00",
      "95500.00",
      "123.456",
      1735003599999,
      "11728500.00",
      150,
      "60.000",
      "5700000.00",
      "0"
    ]
  ]
}
```
 
> Cada kline: `[openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, takerBuyBaseVol, takerBuyQuoteVol, ignore]`
 
---
 
#### `GET /api/market/ui-klines`
 
Idêntico ao `klines`, mas otimizado para UI. Mesmos parâmetros.
 
---
 
#### `GET /api/market/rolling-window-ticker`
 
Estatísticas rolling window (min/max/média no período).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | Sim* | Par de negociação |
| `symbols` | array | Sim* | Múltiplos pares (*pelo menos um dos dois) |
| `windowSize` | string | Não | Tamanho da janela (padrão: `1d`) |
| `type` | string | Não | `FULL` ou `MINI` |
 
---
 
#### `GET /api/market/ticker-price`
 
Retorna o último preço de um ou todos os símbolos.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | Não | Par específico (omita para todos) |
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "price": "95000.50"
  }
}
```
 
---
 
#### `GET /api/market/ticker-24h`
 
Retorna estatísticas 24h de um ou todos os símbolos.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `symbol` | string | Não | Par específico (omita para todos) |
 
---
 
### 5.3 Account
 
> **Todos os endpoints de Account exigem `api_key` e `secret_key`** (via parâmetro ou `.env`).
 
#### `GET /api/account/info`
 
Retorna informações completas da conta (saldos, permissões).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key Binance |
| `secret_key` | string | Não* | Secret Key Binance |
 
> *Obrigatório se não configurado no `.env`.
 
**Exemplo Request:**
```http
GET /api/account/info?api_key=abc123&secret_key=xyz789
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "makerCommission": 10,
    "takerCommission": 10,
    "canTrade": true,
    "canWithdraw": true,
    "canDeposit": true,
    "balances": [
      { "asset": "BTC", "free": "0.50000000", "locked": "0.00000000" },
      { "asset": "USDT", "free": "10000.00", "locked": "500.00" }
    ]
  }
}
```
 
---
 
#### `GET /api/account/balance`
 
Retorna o saldo de um ativo específico.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `asset` | string | **Sim** | Ativo (ex: `BTC`, `ETH`, `USDT`) |
 
**Exemplo Request:**
```http
GET /api/account/balance?asset=BTC
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "asset": "BTC",
    "free": "0.50000000",
    "locked": "0.00000000",
    "total": 0.5
  }
}
```
 
---
 
#### `GET /api/account/open-orders`
 
Lista ordens abertas.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `symbol` | string | Não | Filtrar por símbolo |
 
---
 
#### `GET /api/account/order-history`
 
Histórico de todas as ordens.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `symbol` | string | **Sim** | Par de negociação |
| `limit` | int | Não | Quantidade (padrão: `500`) |
 
---
 
#### `GET /api/account/my-trades`
 
Lista trades executados da conta.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `symbol` | string | **Sim** | Par de negociação |
| `limit` | int | Não | Quantidade (padrão: `500`) |
| `fromId` | int | Não | Trade ID inicial |
| `startTime` | int | Não | Timestamp MS início |
| `endTime` | int | Não | Timestamp MS fim |
 
---
 
#### `GET /api/account/account-status`
 
Status da conta Binance.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
 
---
 
#### `GET /api/account/api-trading-status`
 
Status de trading da API.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
 
---
 
#### `GET /api/account/capital-config`
 
Configurações de capital (saldos detalhados com redes, depósitos, saques).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
 
---
 
#### `POST /api/account/dust-transfer`
 
Converte pequenos saldos (dust) em BNB.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `assets` | array/string | **Sim** | Ativos a converter (ex: `["USDT","ETH"]` ou `"USDT,ETH"`) |
 
**Exemplo Request:**
```http
POST /api/account/dust-transfer
Content-Type: application/json
 
{
  "api_key": "abc123",
  "secret_key": "xyz789",
  "assets": ["ADA", "DOT"]
}
```
 
---
 
#### `GET /api/account/asset-dividend`
 
Consulta dividendos/distribuições de ativos.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `asset` | string | Não | Filtrar por ativo |
| `startTime` | int | Não | Timestamp MS início |
| `endTime` | int | Não | Timestamp MS fim |
| `limit` | int | Não | Quantidade (padrão: `20`) |
 
---
 
#### `GET /api/account/convert-transferable`
 
Verifica se um par de ativos é elegível para conversão.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `fromAsset` | string | **Sim** | Ativo de origem (ex: `BTC`) |
| `toAsset` | string | **Sim** | Ativo de destino (ex: `USDT`) |
 
---
 
#### `GET /api/account/p2p-orders`
 
Histórico de ordens P2P (C2C).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `secret_key` | string | Não* | Secret Key |
| `fiatSymbol` | string | Não | Moeda fiat (ex: `BRL`) |
| `tradeType` | string | Não | Tipo de trade |
| `startTimestamp` | int | Não | Timestamp início |
| `endTimestamp` | int | Não | Timestamp fim |
| `page` | int | Não | Página (padrão: `1`) |
| `rows` | int | Não | Linhas por página (padrão: `20`) |
 
---
 
### 5.4 Trading
 
> **Todos os endpoints de Trading exigem `api_key` e `secret_key`.**
 
#### `POST /api/trading/create-order`
 
Cria uma nova ordem na Binance.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `symbol` | string | **Sim** | Par (ex: `BTCUSDT`) |
| `side` | string | **Sim** | `BUY` ou `SELL` |
| `type` | string | **Sim** | Tipo da ordem (ver tabela abaixo) |
| `quantity` | string | Condicional | Quantidade base |
| `quoteOrderQty` | string | Condicional | Quantidade em quote (apenas MARKET) |
| `price` | string | Condicional | Preço (obrigatório para LIMIT, STOP_LOSS_LIMIT, TAKE_PROFIT_LIMIT, LIMIT_MAKER) |
| `stopPrice` | string | Condicional | Stop price (obrigatório para STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, TAKE_PROFIT_LIMIT) |
| `timeInForce` | string | Não | `GTC` (padrão), `IOC`, `FOK` |
 
**Tipos de ordem:**
 
| Tipo | Requer `price` | Requer `stopPrice` | Requer `timeInForce` |
|---|---|---|---|
| `LIMIT` | Sim | Não | Sim |
| `MARKET` | Não | Não | Não |
| `STOP_LOSS` | Não | Sim | Não |
| `STOP_LOSS_LIMIT` | Sim | Sim | Sim |
| `TAKE_PROFIT` | Não | Sim | Não |
| `TAKE_PROFIT_LIMIT` | Sim | Sim | Sim |
| `LIMIT_MAKER` | Sim | Não | Não |
 
**Exemplo Request — Ordem LIMIT:**
```http
POST /api/trading/create-order
Content-Type: application/json
 
{
  "api_key": "abc123",
  "secret_key": "xyz789",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": "0.001",
  "price": "90000.00",
  "timeInForce": "GTC"
}
```
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "orderId": 12345678,
    "clientOrderId": "abc123def",
    "transactTime": 1735000000000,
    "price": "90000.00",
    "origQty": "0.001",
    "executedQty": "0.000",
    "status": "NEW",
    "type": "LIMIT",
    "side": "BUY"
  }
}
```
 
**Exemplo Request — Ordem MARKET:**
```http
POST /api/trading/create-order
Content-Type: application/json
 
{
  "api_key": "abc123",
  "secret_key": "xyz789",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "MARKET",
  "quoteOrderQty": "100.00"
}
```
 
---
 
#### `POST /api/trading/test-order`
 
Testa a criação de uma ordem **sem executar**. Mesmos parâmetros de `create-order`.
 
---
 
#### `DELETE /api/trading/cancel-order`
 
Cancela uma ordem existente.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `symbol` | string | **Sim** | Par de negociação |
| `orderId` | string | **Sim** | ID da ordem |
 
**Exemplo Request:**
```http
DELETE /api/trading/cancel-order
Content-Type: application/json
 
{
  "api_key": "abc123",
  "secret_key": "xyz789",
  "symbol": "BTCUSDT",
  "orderId": "12345678"
}
```
 
---
 
#### `GET /api/trading/query-order`
 
Consulta status de uma ordem.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `symbol` | string | **Sim** | Par de negociação |
| `orderId` | string | Condicional | ID da ordem |
| `origClientOrderId` | string | Condicional | Client order ID (forneça `orderId` ou `origClientOrderId`) |
 
---
 
#### `DELETE /api/trading/cancel-open-orders`
 
Cancela todas as ordens abertas de um símbolo.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `symbol` | string | **Sim** | Par de negociação |
 
---
 
#### `POST /api/trading/create-oco`
 
Cria uma ordem OCO (One-Cancels-the-Other).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `symbol` | string | **Sim** | Par de negociação |
| `side` | string | **Sim** | `BUY` ou `SELL` |
| `quantity` | string | **Sim** | Quantidade |
| `price` | string | **Sim** | Preço da ordem LIMIT |
| `stopPrice` | string | **Sim** | Stop price |
| `stopLimitPrice` | string | Não | Preço limite do stop |
| `stopLimitTimeInForce` | string | Não | Time in force do stop (padrão: `GTC`) |
 
**Exemplo Request:**
```http
POST /api/trading/create-oco
Content-Type: application/json
 
{
  "api_key": "abc123",
  "secret_key": "xyz789",
  "symbol": "BTCUSDT",
  "side": "SELL",
  "quantity": "0.001",
  "price": "100000.00",
  "stopPrice": "88000.00",
  "stopLimitPrice": "87500.00"
}
```
 
---
 
#### `GET /api/trading/list-oco`
 
Lista ordens OCO.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `fromId` | int | Não | ID inicial |
| `startTime` | int | Não | Timestamp início |
| `endTime` | int | Não | Timestamp fim |
| `limit` | int | Não | Quantidade (padrão: `50`) |
 
---
 
#### `DELETE /api/trading/cancel-oco`
 
Cancela uma ordem OCO.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `orderListId` | string | Condicional | ID do OCO |
| `listClientOrderId` | string | Condicional | Client order ID do OCO |
| `symbol` | string | Não | Par de negociação |
 
---
 
#### `GET /api/trading/order-rate-limit`
 
Consulta limites de criação de ordem.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
 
---
 
#### `GET /api/trading/commission-rate`
 
Consulta taxa de comissão para um símbolo.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | **Sim** | API Key |
| `secret_key` | string | **Sim** | Secret Key |
| `symbol` | string | **Sim** | Par de negociação |
 
---
 
#### `POST /api/trading/cancel-replace`
 
Cancela uma ordem existente e cria outra (atômico). Aceita todos os parâmetros de `create-order` mais:
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `cancelReplaceMode` | string | **Sim** | `STOP_ON_FAILURE` ou `ALLOW_FAILURE` |
| `cancelOrderId` | string | Condicional | ID da ordem a cancelar |
| `cancelOrigClientOrderId` | string | Condicional | Client order ID a cancelar |
 
---
 
## 6. Endpoints — Coinbase
 
> Prefixo: `/api/coinbase/{section}/{action}`
 
### 6.1 Coinbase General
 
#### `GET /api/coinbase/general/ping`
 
Testa conectividade com a API Coinbase (retorna o horário do servidor).
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "iso": "2026-02-27T12:00:00Z",
    "epochSeconds": "1740657600",
    "epochMillis": "1740657600000"
  }
}
```
 
---
 
#### `GET /api/coinbase/general/time`
 
Retorna a hora do servidor Coinbase. Mesma resposta do `ping`.
 
---
 
### 6.2 Coinbase Market
 
#### `GET /api/coinbase/market/products`
 
Lista todos os produtos disponíveis (endpoint público).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `limit` | int | Não | Limite de resultados |
| `offset` | int | Não | Offset para paginação |
| `product_type` | string | Não | Tipo de produto (ex: `SPOT`) |
| `product_ids` | string/array | Não | IDs de produtos (ex: `BTC-USD,ETH-USD`) |
| `get_all_products` | bool | Não | Retornar todos os produtos |
 
---
 
#### `GET /api/coinbase/market/product`
 
Detalha um produto específico.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `product_id` | string | **Sim** | ID do produto (ex: `BTC-USD`) |
 
> Aceita `symbol` como alias de `product_id`.
 
**Exemplo Request:**
```http
GET /api/coinbase/market/product?product_id=BTC-USD
```
 
---
 
#### `GET /api/coinbase/market/product-book`
 
Livro de ofertas de um produto.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `product_id` | string | **Sim** | ID do produto |
| `limit` | int | Não | Níveis de profundidade |
| `aggregation_price_increment` | string | Não | Incremento de agregação |
 
---
 
#### `GET /api/coinbase/market/ticker`
 
Ticker de um produto com trades recentes.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `product_id` | string | **Sim** | ID do produto |
| `limit` | int | Não | Limite de resultados |
| `start` | string | Não | Início do período |
| `end` | string | Não | Fim do período |
 
---
 
#### `GET /api/coinbase/market/candles`
 
Retorna candles (OHLCV) de um produto.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `product_id` | string | **Sim** | ID do produto |
| `start` | string | **Sim** | Timestamp UNIX início |
| `end` | string | **Sim** | Timestamp UNIX fim |
| `granularity` | string | **Sim** | `ONE_MINUTE`, `FIVE_MINUTE`, `FIFTEEN_MINUTE`, `THIRTY_MINUTE`, `ONE_HOUR`, `TWO_HOUR`, `SIX_HOUR`, `ONE_DAY` |
| `limit` | int | Não | Limite de resultados |
 
**Exemplo Request:**
```http
GET /api/coinbase/market/candles?product_id=BTC-USD&start=1735000000&end=1735100000&granularity=ONE_HOUR
```
 
---
 
### 6.3 Coinbase Account
 
> **Requer credenciais Coinbase:** `api_key` + `api_secret` ou `key_file`.
 
#### `GET /api/coinbase/account/accounts`
 
Lista todas as contas (carteiras) do usuário.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key Coinbase |
| `api_secret` | string | Não* | Secret Key / Private Key PEM |
| `key_file` | string | Não* | Caminho para JSON de credenciais |
| `limit` | int | Não | Limite de resultados |
| `cursor` | string | Não | Cursor de paginação |
| `retail_portfolio_id` | string | Não | ID do portfólio |
 
---
 
#### `GET /api/coinbase/account/account`
 
Detalha uma conta por UUID.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `api_secret` | string | Não* | Secret Key |
| `key_file` | string | Não* | JSON de credenciais |
| `account_uuid` | string | **Sim** | UUID da conta |
 
> Aceita `account_id` como alias de `account_uuid`.
 
---
 
### 6.4 Coinbase Trading
 
> **Requer credenciais Coinbase.**
 
#### `POST /api/coinbase/trading/create-order`
 
Cria uma nova ordem na Coinbase.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `api_secret` | string | Não* | Secret Key |
| `key_file` | string | Não* | JSON de credenciais |
| `product_id` | string | **Sim** | Produto (ex: `BTC-USD`) |
| `side` | string | **Sim** | `BUY` ou `SELL` |
| `type` | string | **Sim** | `MARKET` ou `LIMIT` |
| `base_size` | string | Condicional | Quantidade base (alias: `quantity`) |
| `quote_size` | string | Condicional | Quantidade em quote (alias: `quoteOrderQty`). Apenas MARKET |
| `limit_price` | string | Condicional | Preço limite (alias: `price`). Obrigatório para LIMIT |
| `time_in_force` | string | Não | `GTC` (padrão), `IOC`, `FOK` |
| `post_only` | bool | Não | Post-only (apenas LIMIT GTC) |
| `client_order_id` | string | Não | ID customizado (gerado automaticamente se omitido) |
| `leverage` | string | Não | Alavancagem |
| `margin_type` | string | Não | Tipo de margem |
 
> Aceita `symbol` como alias de `product_id`.
 
**Exemplo Request — MARKET:**
```http
POST /api/coinbase/trading/create-order
Content-Type: application/json
 
{
  "product_id": "BTC-USD",
  "side": "BUY",
  "type": "MARKET",
  "quote_size": "100.00"
}
```
 
**Exemplo Request — LIMIT:**
```http
POST /api/coinbase/trading/create-order
Content-Type: application/json
 
{
  "product_id": "BTC-USD",
  "side": "BUY",
  "type": "LIMIT",
  "base_size": "0.001",
  "limit_price": "90000.00",
  "time_in_force": "GTC"
}
```
 
---
 
#### `POST /api/coinbase/trading/cancel-order`
 
Cancela uma ou mais ordens (batch cancel).
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `api_secret` | string | Não* | Secret Key |
| `key_file` | string | Não* | JSON de credenciais |
| `order_ids` | array/string | **Sim** | IDs das ordens (alias: `order_id` para uma única) |
 
**Exemplo Request:**
```http
POST /api/coinbase/trading/cancel-order
Content-Type: application/json
 
{
  "order_ids": ["order-uuid-1", "order-uuid-2"]
}
```
 
---
 
#### `GET /api/coinbase/trading/get-order`
 
Consulta uma ordem por ID.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `api_secret` | string | Não* | Secret Key |
| `key_file` | string | Não* | JSON de credenciais |
| `order_id` | string | **Sim** | ID da ordem |
 
---
 
#### `GET /api/coinbase/trading/list-orders`
 
Lista ordens históricas com filtros avançados.
 
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `api_key` | string | Não* | API Key |
| `api_secret` | string | Não* | Secret Key |
| `key_file` | string | Não* | JSON de credenciais |
| `order_ids` | string/array | Não | Filtrar por IDs |
| `product_ids` | string/array | Não | Filtrar por produtos |
| `order_status` | string/array | Não | Status (ex: `OPEN`, `FILLED`, `CANCELLED`) |
| `limit` | int | Não | Limite de resultados |
| `start_date` | string | Não | Data início |
| `end_date` | string | Não | Data fim |
| `order_types` | string | Não | Tipos de ordem |
| `order_side` | string | Não | Lado (`BUY`/`SELL`) |
| `cursor` | string | Não | Cursor de paginação |
| `product_type` | string | Não | Tipo de produto |
| `sort_by` | string | Não | Campo de ordenação |
 
---
 
## 7. Endpoints Utilitários
 
#### `GET /api/health`
 
Health check. Verifica se o storage é gravável.
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "storage_writable": true
}
```
 
**Exemplo Response (500):**
```json
{
  "success": false,
  "storage_writable": false
}
```
 
---
 
#### `GET /api/metrics`
 
Retorna métricas de uso (requer `METRICS_ENABLED=true`).
 
**Exemplo Response (200):**
```json
{
  "success": true,
  "data": {
    "total_requests": 1500,
    "status_codes": { "200": 1400, "400": 80, "500": 20 },
    "avg_response_time_ms": 120
  }
}
```
 
---
 
#### `GET /api` ou `GET /`
 
Retorna mensagem de boas-vindas.
 
```json
{
  "message": "Binance API REST - PHP"
}
```
 
---
 
## 8. Enums & DTOs
 
### Enums
 
| Enum | Valores | Localização |
|---|---|---|
| `OrderSide` | `BUY`, `SELL` | `src/Enums/OrderSide.php` |
| `OrderType` | `LIMIT`, `MARKET`, `STOP_LOSS`, `STOP_LOSS_LIMIT`, `TAKE_PROFIT`, `TAKE_PROFIT_LIMIT`, `LIMIT_MAKER` | `src/Enums/OrderType.php` |
| `TimeInForce` | `GTC` (Good Till Canceled), `IOC` (Immediate Or Cancel), `FOK` (Fill Or Kill) | `src/Enums/TimeInForce.php` |
| `KlineInterval` | `1s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M` | `src/Enums/KlineInterval.php` |
| `HttpStatus` | `200`, `201`, `204`, `400`, `401`, `403`, `404`, `429`, `500`, `502`, `503` | `src/Enums/HttpStatus.php` |
 
### DTOs
 
| DTO | Campos | Uso |
|---|---|---|
| `TickerDTO` | `symbol`, `price`, `priceChange`, `priceChangePercent`, `highPrice`, `lowPrice`, `volume`, `quoteVolume`, `openTime`, `closeTime` | Dados de ticker |
| `OrderDTO` | `symbol`, `side`, `type`, `quantity`, `quoteOrderQty`, `price`, `stopPrice`, `timeInForce`, `newClientOrderId`, `strategyId`, `strategyType` | Criação de ordem |
| `BalanceDTO` | `asset`, `free`, `locked` + `getTotal()`, `hasFreeBalance()`, `hasBalance()` | Saldo de ativo |
 
---
 
## 9. Rate Limiting
 
Quando `RATE_LIMIT_ENABLED=true`:
 
- Aplicado nos endpoints: `account`, `trading`, `coinbase/account`, `coinbase/trading`
- **Não** aplicado em: `general`, `market`, `coinbase/general`, `coinbase/market`
- Chave: `{section}:{HTTP_METHOD}:{REMOTE_ADDR}`
- Quando excedido: **HTTP 429** + header `Retry-After: N`
 
```json
{
  "success": false,
  "error": "Rate limit excedido. Tente novamente em 60s"
}
```
 
---
 
## 10. Guia de Integração Front-End
 
### 10.1 Configuração Base
 
```javascript
// config.js
const API_BASE_URL = 'http://localhost:8080/api';
 
const apiClient = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};
 
// Se Basic Auth estiver habilitado:
const AUTH_USER = 'admin';
const AUTH_PASS = 'secret';
apiClient.headers['Authorization'] = 'Basic ' + btoa(`${AUTH_USER}:${AUTH_PASS}`);
```
 
### 10.2 Wrapper de Requisição (Fetch API)
 
```javascript
/**
 * Wrapper genérico para chamadas à API
 * @param {string} endpoint - Caminho relativo (ex: '/market/ticker')
 * @param {object} options - { method, params, body }
 * @returns {Promise<object>}
 */
async function apiRequest(endpoint, { method = 'GET', params = {}, body = null } = {}) {
  let url = `${API_BASE_URL}${endpoint}`;
 
  // Adicionar query params para GET
  if (method === 'GET' && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        searchParams.append(key, value);
      }
    }
    url += '?' + searchParams.toString();
  }
 
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': 'Basic ' + btoa('admin:secret'),  // se necessário
    },
  };
 
  if (body && (method === 'POST' || method === 'DELETE')) {
    fetchOptions.body = JSON.stringify(body);
  }
 
  const response = await fetch(url, fetchOptions);
  const data = await response.json();
 
  if (!data.success) {
    throw new Error(data.error || 'Erro desconhecido na API');
  }
 
  return data;
}
```
 
### 10.3 Exemplos Práticos por Seção
 
#### Market Data (público — sem credenciais)
 
```javascript
// Obter preço atual do BTC
async function getBtcPrice() {
  const result = await apiRequest('/market/ticker', {
    params: { symbol: 'BTCUSDT' }
  });
  console.log(`BTC: $${result.data.price} (${result.data.priceChangePercent}%)`);
  return result.data;
}
 
// Obter order book
async function getOrderBook(symbol, limit = 20) {
  return apiRequest('/market/order-book', {
    params: { symbol, limit }
  });
}
 
// Obter klines para gráfico de candlestick
async function getKlines(symbol, interval = '1h', limit = 100) {
  const result = await apiRequest('/market/klines', {
    params: { symbol, interval, limit }
  });
  // Transformar para formato de chart library
  return result.data.map(k => ({
    time: k[0] / 1000,  // converter ms para s
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}
 
// Obter todos os preços
async function getAllPrices() {
  return apiRequest('/market/ticker-price');
}
```
 
#### Account (requer credenciais)
 
```javascript
// Chaves podem vir de variáveis de ambiente ou input do usuário
const credentials = {
  api_key: 'sua_api_key',
  secret_key: 'sua_secret_key',
};
 
// Obter informações da conta
async function getAccountInfo() {
  return apiRequest('/account/info', {
    params: credentials
  });
}
 
// Obter saldo de um ativo específico
async function getBalance(asset) {
  return apiRequest('/account/balance', {
    params: { ...credentials, asset }
  });
}
 
// Obter ordens abertas
async function getOpenOrders(symbol = null) {
  const params = { ...credentials };
  if (symbol) params.symbol = symbol;
  return apiRequest('/account/open-orders', { params });
}
 
// Obter histórico de trades
async function getMyTrades(symbol, limit = 50) {
  return apiRequest('/account/my-trades', {
    params: { ...credentials, symbol, limit }
  });
}
```
 
#### Trading (requer credenciais, usa POST/DELETE)
 
```javascript
// Criar ordem LIMIT de compra
async function createLimitOrder(symbol, side, quantity, price) {
  return apiRequest('/trading/create-order', {
    method: 'POST',
    body: {
      ...credentials,
      symbol,
      side,       // 'BUY' ou 'SELL'
      type: 'LIMIT',
      quantity,
      price,
      timeInForce: 'GTC',
    }
  });
}
 
// Criar ordem MARKET de compra (com valor em USDT)
async function createMarketBuy(symbol, usdtAmount) {
  return apiRequest('/trading/create-order', {
    method: 'POST',
    body: {
      ...credentials,
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty: usdtAmount,
    }
  });
}
 
// Testar ordem (dry-run)
async function testOrder(orderParams) {
  return apiRequest('/trading/test-order', {
    method: 'POST',
    body: { ...credentials, ...orderParams }
  });
}
 
// Cancelar ordem
async function cancelOrder(symbol, orderId) {
  return apiRequest('/trading/cancel-order', {
    method: 'DELETE',
    body: { ...credentials, symbol, orderId }
  });
}
 
// Criar OCO (take-profit + stop-loss)
async function createOco(symbol, side, quantity, price, stopPrice, stopLimitPrice) {
  return apiRequest('/trading/create-oco', {
    method: 'POST',
    body: {
      ...credentials,
      symbol,
      side,
      quantity,
      price,          // take-profit price
      stopPrice,      // trigger price
      stopLimitPrice, // limit após trigger
    }
  });
}
```
 
#### Coinbase
 
```javascript
const cbCredentials = {
  api_key: 'coinbase_api_key',
  api_secret: 'coinbase_private_key_pem',
  // OU: key_file: '/path/to/cdp_api_key.json'
};
 
// Listar produtos Coinbase
async function getCoinbaseProducts() {
  return apiRequest('/coinbase/market/products');
}
 
// Ticker de um produto
async function getCoinbaseTicker(productId) {
  return apiRequest('/coinbase/market/ticker', {
    params: { product_id: productId }
  });
}
 
// Listar contas Coinbase
async function getCoinbaseAccounts() {
  return apiRequest('/coinbase/account/accounts', {
    params: cbCredentials
  });
}
 
// Criar ordem MARKET na Coinbase
async function coinbaseMarketBuy(productId, quoteSize) {
  return apiRequest('/coinbase/trading/create-order', {
    method: 'POST',
    body: {
      ...cbCredentials,
      product_id: productId,
      side: 'BUY',
      type: 'MARKET',
      quote_size: quoteSize,
    }
  });
}
 
// Listar ordens históricas com filtros
async function listCoinbaseOrders(filters = {}) {
  return apiRequest('/coinbase/trading/list-orders', {
    params: { ...cbCredentials, ...filters }
  });
}
```
 
### 10.4 Integração com Axios
 
```javascript
import axios from 'axios';
 
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  // auth: { username: 'admin', password: 'secret' },  // se Basic Auth habilitado
});
 
// Interceptor para tratar erros
api.interceptors.response.use(
  response => {
    if (response.data.success === false) {
      return Promise.reject(new Error(response.data.error));
    }
    return response.data;
  },
  error => {
    if (error.response?.status === 401) {
      // Redirecionar para login
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.warn(`Rate limited. Retry after ${retryAfter}s`);
    }
    return Promise.reject(error);
  }
);
 
// Uso:
const ticker = await api.get('/market/ticker', { params: { symbol: 'BTCUSDT' } });
console.log(ticker.data.price);
```
 
### 10.5 Tratamento de Erros
 
```javascript
async function safeApiCall(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error.message.includes('Rate limit')) {
      // Implementar retry com backoff
      await new Promise(r => setTimeout(r, 5000));
      return fn();
    }
    if (error.message.includes('Não autorizado')) {
      // Credenciais inválidas
      showAuthError();
    }
    if (error.message.includes('Chaves de API não fornecidas')) {
      // Solicitar chaves ao usuário
      showApiKeyForm();
    }
    throw error;
  }
}
 
// Uso:
const price = await safeApiCall(() => getBtcPrice());
```
 
### 10.6 Polling de Dados em Tempo Real
 
```javascript
class PricePoller {
  constructor(symbol, intervalMs = 5000) {
    this.symbol = symbol;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.listeners = [];
  }
 
  onUpdate(callback) {
    this.listeners.push(callback);
  }
 
  start() {
    const poll = async () => {
      try {
        const result = await apiRequest('/market/ticker', {
          params: { symbol: this.symbol }
        });
        this.listeners.forEach(cb => cb(result.data));
      } catch (e) {
        console.error('Poll error:', e.message);
      }
    };
 
    poll(); // primeira chamada imediata
    this.timer = setInterval(poll, this.intervalMs);
  }
 
  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
 
// Uso:
const poller = new PricePoller('BTCUSDT', 3000);
poller.onUpdate(data => {
  document.getElementById('btc-price').textContent = `$${data.price}`;
});
poller.start();
```
 
### 10.7 Mapa de Rotas — Resumo Front-End
 
| Ação no Front-End | Método | Endpoint | Parâmetros Chave |
|---|---|---|---|
| Ver preço de um ativo | GET | `/api/market/ticker` | `symbol` |
| Ver todos os preços | GET | `/api/market/ticker-price` | — |
| Gráfico de candlestick | GET | `/api/market/klines` | `symbol`, `interval`, `limit` |
| Order book | GET | `/api/market/order-book` | `symbol`, `limit` |
| Últimos trades | GET | `/api/market/trades` | `symbol` |
| Info da conta | GET | `/api/account/info` | `api_key`, `secret_key` |
| Saldo de ativo | GET | `/api/account/balance` | `api_key`, `secret_key`, `asset` |
| Ordens abertas | GET | `/api/account/open-orders` | `api_key`, `secret_key` |
| Comprar/Vender | POST | `/api/trading/create-order` | `symbol`, `side`, `type`, `quantity`/`price` |
| Testar ordem | POST | `/api/trading/test-order` | (mesmos de create-order) |
| Cancelar ordem | DELETE | `/api/trading/cancel-order` | `symbol`, `orderId` |
| Health check | GET | `/api/health` | — |
| Métricas | GET | `/api/metrics` | — |
 
---
 
## 11. Convenções de Código
 
### Estrutura de Diretórios
 
```
src/
├── Controllers/          # Controllers por domínio
├── Contracts/            # Interfaces (ClientInterface, CacheInterface, etc.)
├── Database/             # Camada de banco de dados
├── DTO/                  # Data Transfer Objects
├── Enums/                # Enums PHP 8.1
├── Exceptions/           # Exceções customizadas
├── Helpers/              # ArrayHelper, Formatter
├── Http/                 # Request, Response, Middleware/
├── BinanceClient.php     # Client HTTP para Binance
├── CoinbaseClient.php    # Client HTTP para Coinbase
├── Cache.php             # Implementação de cache
├── Config.php            # Gerenciamento de configuração (.env)
├── Container.php         # Container de DI simples
├── FileCache.php         # Cache em arquivo
├── Logger.php            # Logger para arquivo
├── Metrics.php           # Coleta de métricas
├── RateLimiter.php       # Rate limiting
├── Router.php            # Roteador de requisições
└── Validation.php        # Validação de parâmetros
```
 
### Padrões
 
- **PHP 8.1+**: usar enums, readonly properties, named arguments, match expressions
- **PSR-4 Autoloading**: namespace `BinanceAPI\`
- **Testes**: PHPUnit em `tests/` — cada controller tem seu test file
- **Análise estática**: PHPStan (`phpstan.neon`)
- **Respostas**: sempre JSON com `success: bool` + `data` ou `error`
- **Parâmetros GET**: via query string. **POST/DELETE**: via JSON body
- **Symbols**: automaticamente convertidos para UPPERCASE pelo Router
- **Injeção de dependência**: controllers aceitam `ClientInterface` no construtor para testes
