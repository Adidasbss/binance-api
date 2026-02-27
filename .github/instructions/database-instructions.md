---
description: Instrução de banco de dados para a API de Exchanges (Binance/Coinbase) — modelo relacional, DDL PostgreSQL, queries por tag e mapeamento com endpoints.
applyTo: '**/*.{php,sql}'
---

# Banco de Dados — API de Exchanges (Binance/Coinbase)

> Modelo relacional que suporta a API REST multi-exchange, cobrindo cadastro de exchanges, credenciais por owner, auditoria de chamadas e persistência interna de ordens.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Tabelas de Domínio (Catálogo)](#2-tabelas-de-domínio-catálogo)
3. [Tabelas Transacionais](#3-tabelas-transacionais)
4. [DDL Completo (PostgreSQL)](#4-ddl-completo-postgresql)
5. [O que Salvar vs Não Salvar](#5-o-que-salvar-vs-não-salvar)
6. [Mapeamento Endpoints → Banco](#6-mapeamento-endpoints--banco)
7. [Queries de Exemplo (por tag)](#7-queries-de-exemplo-por-tag)
8. [Convenções e Regras](#8-convenções-e-regras)

---

## 1. Visão Geral

| Item | Valor |
|---|---|
| **SGBD** | PostgreSQL (compatível com MySQL via ajustes) |
| **Driver PHP** | PDO (`src/Database/Connection.php`) |
| **Query Loader** | Tags em arquivos `.sql` (`sql/`) via `QueryLoader` |
| **Executor** | `SQL::query()`, `SQL::one()`, `SQL::all()`, `SQL::execute()` |
| **Multi-tenant** | Preparado — `owner_id` é opcional; remova se single-tenant |

### Diagrama de Relacionamento (resumo)

```
td_servicos (exchanges)
    │
    ├── td_integracoes (owner ↔ exchange)
    │       │
    │       └── td_config (credenciais por escopo)
    │               │
    │               └── td_tipo_servico (GENERAL/MARKET/ACCOUNT/TRADING)
    │
    ├── td_api_requests (log de chamadas)
    │
    ├── td_orders (ordens persistidas)
    │       │
    │       └── td_order_events (histórico de eventos)
    │
    └── (users — tabela existente)
```

---

## 2. Tabelas de Domínio (Catálogo)

### 2.1 `td_servicos` — Exchanges

Catálogo de exchanges suportadas pela API.

| Coluna | Tipo | Restrição | Descrição |
|---|---|---|---|
| `idservico` | SERIAL | PK | ID interno |
| `nome` | VARCHAR(50) | UNIQUE NOT NULL | Nome canônico: `BINANCE`, `COINBASE` |
| `descricao` | VARCHAR(255) | NULL | Descrição livre |
| `ativo` | BOOLEAN | DEFAULT TRUE | Exchange habilitada no sistema |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação |

**Seed inicial:**
```sql
INSERT INTO td_servicos (nome, descricao) VALUES
  ('BINANCE', 'Binance Spot/Margin API'),
  ('COINBASE', 'Coinbase Advanced Trade API');
```

---

### 2.2 `td_tipo_servico` — Escopo/Tipo de Operação

Mapeia diretamente para os grupos de endpoints da API.

| Coluna | Tipo | Restrição | Descrição |
|---|---|---|---|
| `idtipo_servico` | SERIAL | PK | ID interno |
| `nome` | VARCHAR(50) | UNIQUE NOT NULL | `GENERAL`, `MARKET`, `ACCOUNT`, `TRADING` |
| `descricao` | VARCHAR(255) | NULL | Descrição do escopo |

**Seed inicial:**
```sql
INSERT INTO td_tipo_servico (nome, descricao) VALUES
  ('GENERAL', 'Endpoints gerais (ping, time, exchange-info)'),
  ('MARKET', 'Endpoints de market data (ticker, klines, order-book)'),
  ('ACCOUNT', 'Endpoints autenticados de conta (info, balance, orders)'),
  ('TRADING', 'Endpoints autenticados de trading (create/cancel/query order)');
```

---

### 2.3 `td_integracoes` — Exchange habilitada por Owner

Representa "este owner (empresa/usuário) usa esta exchange".

| Coluna | Tipo | Restrição | Descrição |
|---|---|---|---|
| `idintegracao` | SERIAL | PK | ID interno |
| `owner_id` | INTEGER | NOT NULL | ID do dono (FK `users.id` se multi-tenant, ou fixo) |
| `idservico` | INTEGER | FK `td_servicos` NOT NULL | Exchange |
| `ativo` | BOOLEAN | DEFAULT TRUE | Integração ativa |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Última atualização |

**Restrição UNIQUE:** `(owner_id, idservico)` — um owner não pode ter a mesma exchange duplicada.

---

### 2.4 `td_config` — Credenciais por Exchange + Escopo

Armazena as configurações que a API precisa para assinar requests e acessar endpoints protegidos.

| Coluna | Tipo | Restrição | Descrição |
|---|---|---|---|
| `idconfiguracao` | SERIAL | PK | ID interno |
| `owner_id` | INTEGER | NOT NULL | ID do dono |
| `idintegracao` | INTEGER | FK `td_integracoes` NOT NULL | Integração |
| `idtipo_servico` | INTEGER | FK `td_tipo_servico` NOT NULL | Escopo (ACCOUNT, TRADING, etc.) |
| `configuracoes` | JSONB | NOT NULL DEFAULT '{}' | JSON com credenciais |
| `ativo` | BOOLEAN | DEFAULT TRUE | Config ativa |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Última atualização |

**Restrição UNIQUE:** `(owner_id, idintegracao, idtipo_servico)` — uma config por owner + integração + escopo.

#### Estrutura do campo `configuracoes` (JSON)

**Binance:**
```json
{
  "apiKey": "abc123...",
  "apiSecret": "xyz789...",
  "baseUrl": "https://api.binance.com",
  "recvWindow": 5000,
  "testnet": false,
  "sslVerify": true,
  "caBundle": null
}
```

**Coinbase (CDP / Advanced Trade):**
```json
{
  "apiKey": "organizations/xxx/apiKeys/yyy",
  "apiSecret": "-----BEGIN EC PRIVATE KEY-----\n...",
  "baseUrl": "https://api.coinbase.com",
  "keyFile": null,
  "sslVerify": true
}
```

> **Regra:** a API valida e padroniza o JSON antes de salvar; o banco apenas armazena.

---

## 3. Tabelas Transacionais

### 3.1 `td_api_requests` — Log de Chamadas (Blackbox Recorder)

Log de **qualquer** chamada que a API faz para a exchange. Substitui/moderniza a tabela `api_logs` existente.

Cobre todos os endpoints: `/api/trading/create-order`, `/api/account/balance`, `/api/market/ticker` (se habilitado), etc.

| Coluna | Tipo | Restrição | Descrição |
|---|---|---|---|
| `idrequest` | BIGSERIAL | PK | ID único do log |
| `owner_id` | INTEGER | NULL | ID do dono (null para chamadas públicas) |
| `idservico` | INTEGER | FK `td_servicos` NULL | Exchange (Binance/Coinbase) |
| `idtipo_servico` | INTEGER | FK `td_tipo_servico` NULL | Escopo (GENERAL/MARKET/ACCOUNT/TRADING) |
| `endpoint` | VARCHAR(255) | NOT NULL | Rota chamada: `/api/trading/create-order` |
| `method` | VARCHAR(10) | NOT NULL | `GET`, `POST`, `DELETE` |
| `params` | JSONB | NULL | Query params normalizados |
| `request_payload` | TEXT | NULL | Body enviado à exchange |
| `response_payload` | TEXT | NULL | Resposta recebida da exchange |
| `http_status` | INTEGER | NOT NULL | Código HTTP da resposta |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'success' | `success`, `error`, `timeout` |
| `duration_ms` | INTEGER | NULL | Tempo de execução em ms |
| `ip_address` | VARCHAR(45) | NULL | IP do cliente |
| `external_id` | VARCHAR(100) | NULL | ID externo (ex: `orderId` da Binance, `order_id` da Coinbase) |
| `correlation_id` | VARCHAR(64) | NULL | X-Request-Id / X-Correlation-Id |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data da chamada |

**Índices:**
- `(owner_id, created_at)`
- `(idservico, idtipo_servico, created_at)`
- `(endpoint, created_at)`
- `(external_id)` — quando existir
- `(http_status, created_at)`
- `(correlation_id)` — para rastreamento

---

### 3.2 `td_orders` — Fonte Interna de Ordens

Tabela dedicada para ordens. Fonte de verdade interna, não depende apenas do retorno externo.

| Coluna | Tipo | Restrição | Descrição |
|---|---|---|---|
| `idorder` | BIGSERIAL | PK | ID interno |
| `owner_id` | INTEGER | NOT NULL | ID do dono |
| `idservico` | INTEGER | FK `td_servicos` NOT NULL | Exchange |
| `symbol` | VARCHAR(30) | NOT NULL | Par: `BTCUSDT`, `ETH-USD`, etc. |
| `side` | VARCHAR(10) | NOT NULL | `BUY` ou `SELL` |
| `type` | VARCHAR(30) | NOT NULL | `MARKET`, `LIMIT`, `STOP_LOSS`, `STOP_LOSS_LIMIT`, etc. |
| `quantity` | DECIMAL(20,8) | NULL | Quantidade base |
| `quote_quantity` | DECIMAL(20,8) | NULL | Quantidade em quote (MARKET) |
| `price` | DECIMAL(20,8) | NULL | Preço (LIMIT, etc.) |
| `stop_price` | DECIMAL(20,8) | NULL | Stop price |
| `time_in_force` | VARCHAR(10) | NULL | `GTC`, `IOC`, `FOK` |
| `status` | VARCHAR(30) | NOT NULL DEFAULT 'NEW' | `NEW`, `OPEN`, `PARTIALLY_FILLED`, `FILLED`, `CANCELED`, `REJECTED`, `EXPIRED` |
| `executed_qty` | DECIMAL(20,8) | DEFAULT 0 | Quantidade executada |
| `executed_price` | DECIMAL(20,8) | NULL | Preço médio de execução |
| `external_order_id` | VARCHAR(100) | NULL | `orderId` da exchange |
| `client_order_id` | VARCHAR(100) | NULL | ID customizado do cliente |
| `raw_create_response` | JSONB | NULL | Resposta bruta de criação (auditoria) |
| `raw_cancel_response` | JSONB | NULL | Resposta bruta de cancelamento |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Última atualização |

**Índices:**
- `UNIQUE (idservico, external_order_id)` — quando `external_order_id` não é null
- `(owner_id, created_at)`
- `(symbol, created_at)`
- `(status, updated_at)`
- `(client_order_id)`

**Constraint CHECK:**
- `side IN ('BUY', 'SELL')`

---

### 3.3 `td_order_events` — Histórico de Eventos da Ordem

Para rastrear o ciclo de vida de cada ordem: criação, atualização, preenchimento, cancelamento e sincronizações.

| Coluna | Tipo | Restrição | Descrição |
|---|---|---|---|
| `idevent` | BIGSERIAL | PK | ID do evento |
| `idorder` | BIGINT | FK `td_orders` NOT NULL | Ordem relacionada |
| `event_type` | VARCHAR(30) | NOT NULL | `created`, `updated`, `partially_filled`, `filled`, `canceled`, `rejected`, `expired`, `sync` |
| `old_status` | VARCHAR(30) | NULL | Status anterior |
| `new_status` | VARCHAR(30) | NULL | Status novo |
| `payload` | JSONB | NULL | Dados do evento (resposta da exchange, motivo, etc.) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Timestamp do evento |

**Índices:**
- `(idorder, created_at)`
- `(event_type, created_at)`

---

## 4. DDL Completo (PostgreSQL)

```sql
-- ================================================
-- DDL - Tabelas de Exchange (PostgreSQL)
-- Execute após o schema.sql existente
-- ================================================

-- -----------------------------------------------
-- 2.1 td_servicos (catálogo de exchanges)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS td_servicos (
    idservico    SERIAL PRIMARY KEY,
    nome         VARCHAR(50) NOT NULL UNIQUE,
    descricao    VARCHAR(255),
    ativo        BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO td_servicos (nome, descricao) VALUES
    ('BINANCE', 'Binance Spot/Margin API'),
    ('COINBASE', 'Coinbase Advanced Trade API')
ON CONFLICT (nome) DO NOTHING;

-- -----------------------------------------------
-- 2.2 td_tipo_servico (escopos de operação)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS td_tipo_servico (
    idtipo_servico  SERIAL PRIMARY KEY,
    nome            VARCHAR(50) NOT NULL UNIQUE,
    descricao       VARCHAR(255)
);

INSERT INTO td_tipo_servico (nome, descricao) VALUES
    ('GENERAL',  'Endpoints gerais (ping, time, exchange-info)'),
    ('MARKET',   'Endpoints de market data (ticker, klines, order-book)'),
    ('ACCOUNT',  'Endpoints autenticados de conta (info, balance, orders)'),
    ('TRADING',  'Endpoints autenticados de trading (create/cancel/query order)')
ON CONFLICT (nome) DO NOTHING;

-- -----------------------------------------------
-- 2.3 td_integracoes (owner ↔ exchange)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS td_integracoes (
    idintegracao  SERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL,
    idservico     INTEGER NOT NULL REFERENCES td_servicos(idservico) ON DELETE CASCADE,
    ativo         BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (owner_id, idservico)
);

CREATE INDEX IF NOT EXISTS idx_integracoes_owner ON td_integracoes(owner_id);
CREATE INDEX IF NOT EXISTS idx_integracoes_servico ON td_integracoes(idservico);

-- -----------------------------------------------
-- 2.4 td_config (credenciais por escopo)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS td_config (
    idconfiguracao   SERIAL PRIMARY KEY,
    owner_id         INTEGER NOT NULL,
    idintegracao     INTEGER NOT NULL REFERENCES td_integracoes(idintegracao) ON DELETE CASCADE,
    idtipo_servico   INTEGER NOT NULL REFERENCES td_tipo_servico(idtipo_servico) ON DELETE CASCADE,
    configuracoes    JSONB NOT NULL DEFAULT '{}',
    ativo            BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (owner_id, idintegracao, idtipo_servico)
);

CREATE INDEX IF NOT EXISTS idx_config_owner ON td_config(owner_id);
CREATE INDEX IF NOT EXISTS idx_config_integracao ON td_config(idintegracao);

-- -----------------------------------------------
-- 3.1 td_api_requests (log de chamadas)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS td_api_requests (
    idrequest         BIGSERIAL PRIMARY KEY,
    owner_id          INTEGER,
    idservico         INTEGER REFERENCES td_servicos(idservico),
    idtipo_servico    INTEGER REFERENCES td_tipo_servico(idtipo_servico),
    endpoint          VARCHAR(255) NOT NULL,
    method            VARCHAR(10) NOT NULL,
    params            JSONB,
    request_payload   TEXT,
    response_payload  TEXT,
    http_status       INTEGER NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'success',
    duration_ms       INTEGER,
    ip_address        VARCHAR(45),
    external_id       VARCHAR(100),
    correlation_id    VARCHAR(64),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_apireq_owner_created
    ON td_api_requests(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_apireq_servico_tipo_created
    ON td_api_requests(idservico, idtipo_servico, created_at);
CREATE INDEX IF NOT EXISTS idx_apireq_endpoint_created
    ON td_api_requests(endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_apireq_external_id
    ON td_api_requests(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apireq_http_status
    ON td_api_requests(http_status, created_at);
CREATE INDEX IF NOT EXISTS idx_apireq_correlation
    ON td_api_requests(correlation_id) WHERE correlation_id IS NOT NULL;

-- -----------------------------------------------
-- 3.2 td_orders (ordens persistidas)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS td_orders (
    idorder            BIGSERIAL PRIMARY KEY,
    owner_id           INTEGER NOT NULL,
    idservico          INTEGER NOT NULL REFERENCES td_servicos(idservico),
    symbol             VARCHAR(30) NOT NULL,
    side               VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type               VARCHAR(30) NOT NULL,
    quantity           DECIMAL(20,8),
    quote_quantity     DECIMAL(20,8),
    price              DECIMAL(20,8),
    stop_price         DECIMAL(20,8),
    time_in_force      VARCHAR(10),
    status             VARCHAR(30) NOT NULL DEFAULT 'NEW',
    executed_qty       DECIMAL(20,8) DEFAULT 0,
    executed_price     DECIMAL(20,8),
    external_order_id  VARCHAR(100),
    client_order_id    VARCHAR(100),
    raw_create_response  JSONB,
    raw_cancel_response  JSONB,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique parcial: garante unicidade por exchange quando external_order_id existe
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_exchange_external
    ON td_orders(idservico, external_order_id)
    WHERE external_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_owner_created
    ON td_orders(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_symbol_created
    ON td_orders(symbol, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_updated
    ON td_orders(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_client_order_id
    ON td_orders(client_order_id) WHERE client_order_id IS NOT NULL;

-- -----------------------------------------------
-- 3.3 td_order_events (histórico de eventos)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS td_order_events (
    idevent      BIGSERIAL PRIMARY KEY,
    idorder      BIGINT NOT NULL REFERENCES td_orders(idorder) ON DELETE CASCADE,
    event_type   VARCHAR(30) NOT NULL,
    old_status   VARCHAR(30),
    new_status   VARCHAR(30),
    payload      JSONB,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_order_created
    ON td_order_events(idorder, created_at);
CREATE INDEX IF NOT EXISTS idx_events_type_created
    ON td_order_events(event_type, created_at);

-- -----------------------------------------------
-- Triggers para updated_at automático
-- -----------------------------------------------
DROP TRIGGER IF EXISTS update_td_integracoes_updated_at ON td_integracoes;
CREATE TRIGGER update_td_integracoes_updated_at
    BEFORE UPDATE ON td_integracoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_td_config_updated_at ON td_config;
CREATE TRIGGER update_td_config_updated_at
    BEFORE UPDATE ON td_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_td_orders_updated_at ON td_orders;
CREATE TRIGGER update_td_orders_updated_at
    BEFORE UPDATE ON td_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

> **Nota:** a função `update_updated_at_column()` já existe em `sql/schema.sql`. Se estiver rodando o DDL isolado, crie-a antes.

---

## 5. O que Salvar vs Não Salvar

| Escopo | Persistir em `td_api_requests` | Persistir em `td_orders` | Observação |
|---|---|---|---|
| **GENERAL** (ping, time) | Opcional | Não | Só se `LOG_GENERAL=true` |
| **MARKET** (ticker, klines, order-book) | Opcional | Não | Preferir cache in-memory/Redis. Logar se `LOG_MARKET=true` |
| **ACCOUNT** (info, balance, trades) | **Obrigatório** | Não | Auditoria de chamadas autenticadas |
| **TRADING** (create/cancel/query order) | **Obrigatório** | **Obrigatório** | Fonte de verdade + auditoria |

### Regra de Ouro

- **ACCOUNT + TRADING** → sempre gravar `td_api_requests`
- **TRADING com criação/cancelamento** → sempre gravar `td_orders` + `td_order_events`
- **MARKET + GENERAL** → cache e log opcional (evita banco monstro)

---

## 6. Mapeamento Endpoints → Banco

### Binance

| Endpoint | Método | Usa Config | Grava `td_api_requests` | Grava `td_orders` | Grava `td_order_events` |
|---|---|---|---|---|---|
| `GET /api/general/ping` | GET | Não | Opcional | Não | Não |
| `GET /api/general/time` | GET | Não | Opcional | Não | Não |
| `GET /api/general/exchange-info` | GET | Não | Opcional | Não | Não |
| `GET /api/market/ticker` | GET | Não | Opcional | Não | Não |
| `GET /api/market/klines` | GET | Não | Opcional | Não | Não |
| `GET /api/market/order-book` | GET | Não | Opcional | Não | Não |
| `GET /api/account/info` | GET | ACCOUNT | **Sim** | Não | Não |
| `GET /api/account/balance` | GET | ACCOUNT | **Sim** | Não | Não |
| `GET /api/account/open-orders` | GET | ACCOUNT | **Sim** | Não | Não |
| `GET /api/account/my-trades` | GET | ACCOUNT | **Sim** | Não | Não |
| `POST /api/trading/create-order` | POST | TRADING | **Sim** | **Sim** (INSERT) | **Sim** (`created`) |
| `POST /api/trading/test-order` | POST | TRADING | **Sim** | Não | Não |
| `DELETE /api/trading/cancel-order` | DELETE | TRADING | **Sim** | **Sim** (UPDATE status) | **Sim** (`canceled`) |
| `GET /api/trading/query-order` | GET | TRADING | **Sim** | Opcional (sync) | Opcional (`sync`) |
| `POST /api/trading/create-oco` | POST | TRADING | **Sim** | **Sim** | **Sim** (`created`) |
| `DELETE /api/trading/cancel-oco` | DELETE | TRADING | **Sim** | **Sim** (UPDATE) | **Sim** (`canceled`) |
| `POST /api/trading/cancel-replace` | POST | TRADING | **Sim** | **Sim** (UPDATE + INSERT) | **Sim** (`canceled` + `created`) |

### Coinbase

| Endpoint | Método | Usa Config | Grava `td_api_requests` | Grava `td_orders` | Grava `td_order_events` |
|---|---|---|---|---|---|
| `GET /api/coinbase/general/ping` | GET | Não | Opcional | Não | Não |
| `GET /api/coinbase/market/products` | GET | Não | Opcional | Não | Não |
| `GET /api/coinbase/market/ticker` | GET | Não | Opcional | Não | Não |
| `GET /api/coinbase/account/accounts` | GET | ACCOUNT | **Sim** | Não | Não |
| `GET /api/coinbase/account/account` | GET | ACCOUNT | **Sim** | Não | Não |
| `POST /api/coinbase/trading/create-order` | POST | TRADING | **Sim** | **Sim** | **Sim** (`created`) |
| `POST /api/coinbase/trading/cancel-order` | POST | TRADING | **Sim** | **Sim** (UPDATE) | **Sim** (`canceled`) |
| `GET /api/coinbase/trading/get-order` | GET | TRADING | **Sim** | Opcional (sync) | Opcional (`sync`) |
| `GET /api/coinbase/trading/list-orders` | GET | TRADING | **Sim** | Não | Não |

---

## 7. Queries de Exemplo (por tag)

Estas queries seguem o padrão de tags do `QueryLoader` (`sql/*.sql`).

### 7.1 Resolver Config de uma Exchange (query de bootstrap)

```sql
-- @tag: config.resolve
-- Busca config completa: exchange + escopo + credenciais
SELECT
    c.idconfiguracao,
    c.owner_id,
    s.nome AS exchange,
    ts.nome AS escopo,
    c.configuracoes,
    c.ativo
FROM td_config c
JOIN td_integracoes i ON i.idintegracao = c.idintegracao
JOIN td_servicos s ON s.idservico = i.idservico
JOIN td_tipo_servico ts ON ts.idtipo_servico = c.idtipo_servico
WHERE c.idconfiguracao = :idconfiguracao;
```

### 7.2 Buscar config por owner + exchange + escopo

```sql
-- @tag: config.find_by_owner_exchange_scope
SELECT
    c.idconfiguracao,
    c.configuracoes,
    c.ativo
FROM td_config c
JOIN td_integracoes i ON i.idintegracao = c.idintegracao
JOIN td_servicos s ON s.idservico = i.idservico
JOIN td_tipo_servico ts ON ts.idtipo_servico = c.idtipo_servico
WHERE c.owner_id = :owner_id
  AND s.nome = :exchange
  AND ts.nome = :escopo
  AND c.ativo = TRUE
  AND i.ativo = TRUE
LIMIT 1;
```

### 7.3 Registrar chamada de API

```sql
-- @tag: api_requests.create
INSERT INTO td_api_requests (
    owner_id, idservico, idtipo_servico, endpoint, method,
    params, request_payload, response_payload,
    http_status, status, duration_ms, ip_address,
    external_id, correlation_id
) VALUES (
    :owner_id, :idservico, :idtipo_servico, :endpoint, :method,
    :params, :request_payload, :response_payload,
    :http_status, :status, :duration_ms, :ip_address,
    :external_id, :correlation_id
)
RETURNING idrequest;
```

### 7.4 Criar ordem

```sql
-- @tag: td_orders.create
INSERT INTO td_orders (
    owner_id, idservico, symbol, side, type,
    quantity, quote_quantity, price, stop_price,
    time_in_force, status, external_order_id,
    client_order_id, raw_create_response
) VALUES (
    :owner_id, :idservico, :symbol, :side, :type,
    :quantity, :quote_quantity, :price, :stop_price,
    :time_in_force, :status, :external_order_id,
    :client_order_id, :raw_create_response
)
RETURNING idorder;
```

### 7.5 Atualizar status da ordem

```sql
-- @tag: td_orders.update_status
UPDATE td_orders
SET status = :status,
    executed_qty = COALESCE(:executed_qty, executed_qty),
    executed_price = COALESCE(:executed_price, executed_price),
    raw_cancel_response = COALESCE(:raw_cancel_response, raw_cancel_response)
WHERE idorder = :idorder;
```

### 7.6 Registrar evento da ordem

```sql
-- @tag: td_order_events.create
INSERT INTO td_order_events (
    idorder, event_type, old_status, new_status, payload
) VALUES (
    :idorder, :event_type, :old_status, :new_status, :payload
)
RETURNING idevent;
```

### 7.7 Buscar ordem por external_order_id

```sql
-- @tag: td_orders.find_by_external_id
SELECT *
FROM td_orders
WHERE idservico = :idservico
  AND external_order_id = :external_order_id
LIMIT 1;
```

### 7.8 Listar ordens por owner + symbol

```sql
-- @tag: td_orders.list_by_owner_symbol
SELECT *
FROM td_orders
WHERE owner_id = :owner_id
  AND (:symbol IS NULL OR symbol = :symbol)
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

### 7.9 Histórico de eventos de uma ordem

```sql
-- @tag: td_order_events.list_by_order
SELECT *
FROM td_order_events
WHERE idorder = :idorder
ORDER BY created_at ASC;
```

### 7.10 Estatísticas de chamadas por exchange

```sql
-- @tag: api_requests.stats_by_exchange
SELECT
    s.nome AS exchange,
    ts.nome AS escopo,
    COUNT(*) AS total_calls,
    AVG(r.duration_ms) AS avg_duration_ms,
    SUM(CASE WHEN r.http_status >= 400 THEN 1 ELSE 0 END) AS errors
FROM td_api_requests r
JOIN td_servicos s ON s.idservico = r.idservico
JOIN td_tipo_servico ts ON ts.idtipo_servico = r.idtipo_servico
WHERE r.created_at >= :since
GROUP BY s.nome, ts.nome
ORDER BY total_calls DESC;
```

### 7.11 Cleanup de logs antigos

```sql
-- @tag: api_requests.cleanup_old
DELETE FROM td_api_requests
WHERE created_at < NOW() - INTERVAL '1 day' * :days;
```

---

## 8. Convenções e Regras

### Nomenclatura

| Tipo | Convenção | Exemplo |
|---|---|---|
| Tabela de domínio | `td_` prefixo | `td_servicos`, `td_config` |
| PK | `id{tabela}` (singular) | `idservico`, `idorder` |
| FK | mesmo nome da PK referenciada | `idservico`, `idintegracao` |
| Timestamps | `created_at`, `updated_at` | — |
| JSON | JSONB (PostgreSQL) | `configuracoes`, `payload` |
| Status | VARCHAR com valores descritivos | `NEW`, `FILLED`, `CANCELED` |

### Fluxo no Código PHP

```
1. Request chega no Router
2. Router resolve endpoint → Controller
3. Controller precisa de credenciais?
   → SIM: buscar td_config via SQL::one('config.find_by_owner_exchange_scope', [...])
   → NÃO: seguir direto
4. Controller chama a exchange (BinanceClient / CoinbaseClient)
5. Gravar td_api_requests via SQL::insert('api_requests.create', [...])
6. Se for TRADING com create/cancel:
   → SQL::transaction(function() {
       SQL::insert('td_orders.create', [...])      // ou update_status
       SQL::insert('td_order_events.create', [...])
     })
7. Retornar response ao cliente
```

### Compatibilidade com Schema Existente

O DDL das tabelas `td_*` é **aditivo** — não altera as tabelas `users`, `orders`, `settings` ou `api_logs` já existentes em `sql/schema.sql`. Pode-se migrar gradualmente:

- `orders` → `td_orders` (mais completa, multi-exchange)
- `api_logs` → `td_api_requests` (mais campos, vinculada a exchange/escopo)
- `settings` → `td_config` (para credenciais; manter `settings` para config geral)

### Segurança

- **Nunca** logar `api_key` / `secret_key` em `td_api_requests.params` ou `request_payload`
- Sanitizar o JSON antes de salvar em `configuracoes` — remover campos sensíveis de logs
- Usar colunas `ativo` para soft-disable em vez de DELETE
- Aplicar RBAC no `owner_id` antes de qualquer SELECT
 