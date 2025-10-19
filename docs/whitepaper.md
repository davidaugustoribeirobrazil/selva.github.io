# SELVA — Technical Whitepaper (v1.0)

**Chain:** Base (Mainnet)  
**Standard:** ERC-20 (18 decimals)  
**Token Address:** `0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2`  
**Primary Market:** Uniswap v3 (Base) — SELVA/USDC (0.3% / 3000)  
**Pool Address:** `0xF109456223621006e35A66f4Fb5f934E0E63de09`  

> This document describes SELVA’s technical design, market plumbing (DEX/Liquidity), tooling, and operational practices. It is informational and does not constitute financial advice.

---

## 1. Overview

**SELVA** is an ERC-20 token deployed on **Base** designed for practical utility within the SELVA ecosystem—centering on **DEX-native liquidity** (Uniswap v3), **wallet compatibility**, and **automation tooling** for market operations (quotes, approvals, swaps, and LP fee accrual strategies).

Design principles:
- **Simplicity & Compatibility:** standard ERC-20 with **no transfer fees** and **no restrictive hooks**; compatible with Uniswap v3, routers, and Permit2/Universal Router flows.
- **DEX-first Liquidity:** primary pair **SELVA/USDC** on Uniswap v3 (fee tier 0.3%).
- **Transparent Tooling:** open scripts for approvals, previews, swaps (single-hop) and **autoswap** (randomized sizes & delays within bounds).

---

## 2. Contract & Addresses

- **SELVA (ERC-20):**  
  `0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2` (18 decimals)

- **Uniswap v3 (Base) — operational addresses used by our tooling:**  
  - **SwapRouter (v3):** `0x2626664c2603336E57B271c5C0b26F421741e481`  
  - **Quoter (v2/quoter):** `0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a`  
  - **Primary Pool (SELVA/USDC, 0.3%):** `0xF109456223621006e35A66f4Fb5f934E0E63de09`  
  - **Permit2 (canonical):** `0x000000000022D473030F116dDEE9F6B43aC78BA3`  
  - **Universal Router:** printed by scripts at runtime (based on upstream deployments).

> Some protocol addresses are ecosystem-standard. Always verify on-chain.

---

## 3. Token Specification

- **Standard:** ERC-20  
- **Decimals:** 18  
- **Transfer Fees:** **None (0%)**  
- **DEX Compatibility:** confirmed single-hop USDC⇄SELVA via fee **3000 (0.3%)**  
- **Restrictions / Blacklists / Cooldowns:** **none**  
- **Ownership & Admin:** disclose owner/multisig/timelock if any (address & privileges).

---

## 4. Market Structure (Uniswap v3)

- **Primary Pair:** SELVA/USDC (fee 0.3% / 3000); pool: `0xF109...de09`.  
- **Concentrated Liquidity:** fees accrue when trades cross active liquidity ranges.  
- **Routing:** single-hop preferred for price clarity; multi-hop only if extra pools have liquidity.

Operational notes:
- Price outside active range → quotes can revert/near-zero.
- No fee-on-transfer → avoids common v3 failure mode.

---

## 5. Tooling & Automation

- **Balance & Approval:**  
  - `approve.js` — handles ERC-20 `approve` (router/Permit2 + Universal Router path).  
  - `index.js` — stores `ADDRESS` (public) and relies on `.env` for `PRIVATE_KEY`.

- **Swap & Quote:**  
  - `swap.js` — preview, buy/sell (simple), Permit2/UR flow (when enabled).

- **Autoswap (fee accrual strategy):**  
  Alterna **compras/vendas** com **valores e delays pseudo-aleatórios** dentro de limites, visando **estimular volume** na faixa ativa (logo, **acúmulo de fees**).

> Secrets (`PRIVATE_KEY` / RPC keys) ficam fora do Git via `.env` + `.gitignore`.

---

## 6. LP Fee Accrual — Technical Considerations

- **Fee tier:** 0.3% (3000)  
- **Principle:** volume que cruza liquidez ativa gera taxa proporcional  
- **Ops (exemplo):** delays 2–3s; tamanhos dentro de faixas compatíveis com TVL e pool  
- **Slippage:** padrão (ex.: 0.5%) com `minOut` seguro  
- **Ranges:** estreito = maior yield quando ativo (mas sai fácil); largo = menor yield por unit liquidity (mais cobertura)

---

## 7. Wallet & Ecosystem Integration

- **Wallets:** MetaMask, Base Wallet; import via address + decimals=18  
- **Logos/Metadata:** SVG/PNG transparentes, square (ex.: 512×512); simetria & proporção áurea  
- **Coinbase/Base Wallet:** PNG normalmente aceito; SVG recomendado

---

## 8. Security Posture

- **Sem fee-on-transfer / honeypot:** testado por `callStatic` e swaps reais  
- **Permit2/Universal Router:** requer 2 approvals (ERC20→Permit2 e Permit2→UR); automação via flag  
- **Key management:** `.env` local, nunca em git  
- **Audits:** adicionar caso existam; caso contrário, “No external audit at this time”

---

## 9. Roadmap (High-Level)

- **Phase 1:** Liquidity & Wallets (logo, metadata, CoinGecko, docs, UX)  
- **Phase 2:** LP Analytics (ticks, fee growth, rebalance, simulações)  
- **Phase 3:** Utilities (dashboards, alerts, pares alternativos conforme liquidez)

---

## 10. Disclaimers

Informational only; not financial, investment, or legal advice. Crypto is volatile; DYOR. Protocol addresses and integrations may evolve—verify before transacting.

---

## 11. Quick Links

- **Token (BaseScan):** _add contract URL_  
- **Pool (Uniswap v3, 0.3%):** _add pool URL_  
- **Repository / Docs:** _your GitHub or site_  
- **Contact:** _email or form_  
- **Logo Assets:** _link to SVG/PNGs hosted in repo_
