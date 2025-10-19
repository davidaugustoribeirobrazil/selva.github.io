# SELVA — Uniswap v3 (Base) Setup

Este pacote adiciona scripts para criar/inicializar a pool e prover liquidez na Uniswap v3 (Base).

## Passos

1. **Mergir `package.full.example.json`** (ou copiar o conteúdo para seu `package.json`) para incluir deps e scripts:
   - `@uniswap/v3-sdk`, `@uniswap/sdk-core`, `viem`, `ethers@^6`, `ts-node`, `typescript`
   - Scripts:
     - `npm run accounts` — checa contas/balance
     - `npm run pool:create` — cria/inicializa pool e faz mint da posição

2. **Instalar deps**
```bash
npm i
```

3. **Crie um `.env` com as variáveis do token e da pool** (há um `.env.pool.example`):
```env
SELVA_ADDRESS=0xSEU_TOKEN
PAIR_TOKEN=USDC
FEE=3000
TARGET_PRICE=0.01
RANGE_PCT=20
AMOUNT_SELVA=500000
```

4. **Testar contas e saldo**
```bash
npm run accounts
```

5. **Executar criação da pool + LP (Base)**:
```bash
npm run pool:create -- --network base
```

> Observações:
> - O script calcula `sqrtPriceX96` e **ticks** usando o `@uniswap/v3-sdk` para maior precisão.
> - A faixa padrão é ±`RANGE_PCT` % ao redor do preço alvo. Ajuste para concentrar liquidez.
> - Verifique no explorer da Base se a pool foi criada e se seu **NFT de LP** apareceu na sua carteira.

## Segurança e mercado
- Evite faixas muito estreitas se o volume inicial for baixo (risco de sair da faixa).
- Prefira `SELVA/USDC` para preço mais estável (quotes em dólar).
- Mantenha transparência de tokenomics e evite práticas de manipulação de preço.
