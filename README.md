# SELVA – Token ERC‑20 na Base (Hardhat)

Projeto Hardhat para o token **SELVA** (símbolo `SELVA`) pensado para a rede **Base**.
- **Padrões**: ERC‑20, ERC‑2612 (permit), Burnable
- **Suprimento**: fixo (cunhado 1x no construtor)
- **Taxas**: nenhuma
- **Admin**: `Ownable` (defina um multisig como owner ou renuncie)

> Observação: Listagem na Coinbase depende de critérios fora do código (conformidade, riscos, liquidez, etc.). Este repositório entrega um contrato simples e verificável, geralmente preferido por corretoras, mas **não garante listagem**.

## Pré‑requisitos
- Node.js 18+
- Chave privada com fundos em Base / Base Sepolia
- RPCs:
  - Base mainnet: `https://mainnet.base.org` (ou provedor como Alchemy/Infura)
  - Base Sepolia: `https://sepolia.base.org`
- Conta no BaseScan para obter `BASESCAN_API_KEY` (verificação do contrato)

## Instalação
```bash
npm i
```

## Configuração (.env)
Crie `.env` a partir do exemplo:
```env
PRIVATE_KEY=0xSEU_PRIV_KEY
OWNER_ADDRESS=0xDONO_OU_MULTISIG
INITIAL_SUPPLY=1000000000000000000000000   # 1,000,000 SELVA (18 decimais)
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=coloque_sua_chave
```

## Comandos úteis
```bash
# Compilar e testar
npx hardhat compile
npx hardhat test

# Deploy em Base Sepolia (teste)
npm run deploy:base-sepolia

# Deploy em Base mainnet
npm run deploy:base

# Verificar no BaseScan (substitua ADDRESS pelo endereço retornado no deploy)
ADDRESS=0xSEU_CONTRATO npm run verify:base-sepolia
ADDRESS=0xSEU_CONTRATO npm run verify:base
```

## Boas práticas para listagem
- **Código simples** (sem taxas/blacklists/rebase), **verificado** no BaseScan.
- **Owner**: use **multisig**; ou **renuncie** (`renounceOwnership`) se o projeto não precisar de controles.
- **Auditoria** e documentação pública da **tokenomics**.
- Política de **não‑mint** (suprimento fixo) – já adotado neste contrato.

## Parametrização de suprimento
O construtor recebe `initialSupply` em wei (18 casas). Exemplos:
- 1,000,000 SELVA → `1_000_000 * 10**18`
- 1,000,000,000 SELVA → `1_000_000_000 * 10**18`

## Licença
MIT
