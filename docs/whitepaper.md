# SELVA — Technical Whitepaper (v1)

**Chain:** Base (Mainnet)  
**Standard:** ERC-20 (no transfer fees, no restrictive hooks)  
**Decimals:** 18  
**Token Address:** `0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2`  
**Primary Pool (Uniswap v3):** SELVA / USDC (fee 0.30%)  
**Pool Address:** `0xF109456223621006e35A66f4Fb5f934E0E63de09`

> This document provides the technical and operational context for SELVA as a DEX-first ERC-20 token on Base, outlining contract facts, market structure, routing, tooling, security posture, and governance approach. It is **not** investment advice.

---

## 1. Overview

SELVA is an ERC-20 token deployed on the **Base** network with a **DEX-first** liquidity model using **Uniswap v3**. The design prioritizes:
- **Simplicity at the token level** (standard ERC-20; no fee-on-transfer; no blocklists or custom transfer logic that would break router/pool flows).
- **Concentrated liquidity** on Uniswap v3 (0.30% fee tier) to support discoverable pricing and efficient swaps against USDC.
- **Open tooling** for automated execution (quotes, approvals, slippage guard, and on-chain routing via Universal Router + Permit2).

**Key addresses**
- Token: `0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2`  
  View: https://basescan.org/token/0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2
- Pool (Uniswap v3, fee=3000): `0xF109456223621006e35A66f4Fb5f934E0E63de09`  
  View: https://app.uniswap.org/positions/v3/base/4052179

---

## 2. Token Contract Characteristics

- **ERC-20 compliance:** standard interfaces `totalSupply`, `balanceOf`, `transfer`, `allowance`, `approve`, `transferFrom`.
- **No transfer fees:** tested against Router and Pool paths; transfers and `transferFrom` execute without balance-skimming.
- **No restrictive hooks:** no cooldowns, max-tx, trading toggles, blacklists, or dynamic taxes that would revert router pathways.
- **Decimals:** 18.
- **Ownership/roles:** follow the current on-chain state as visible in the verified contract on BaseScan. Any upgradeability or privileged functions (if present) should be clearly documented in the verified source and timelocked if applicable.

> **Note:** Readers should always verify the contract on BaseScan to confirm source, compiler settings, and any owner-only methods.

---

## 3. Market Structure (Uniswap v3)

- **Primary pair:** SELVA/USDC at **0.30%** fee tier (`3000`).
- **Concentrated liquidity:** LPs can place liquidity around chosen price ranges, improving capital efficiency when the market trades within those ticks.
- **Single-hop routing:** The design targets **USDC ⇄ SELVA** in a single pool to reduce path complexity and revert risks from multi-hop routes.
- **Price discovery:** Arbitrage and organic order flow align pool price with broader market demand.

**Operational notes**
- **Quotes:** Use Uniswap v3 `Quoter` or Universal Router simulation for `amountOut` previews.  
- **Slippage:** Recommended default **0.5%** for organic swaps; adapt to market conditions and pool depth.  
- **Deadline:** Typical **600s** to balance UX and protection against stale quotes.

---

## 4. Execution Tooling

The execution stack used during development and testing includes:

1. **Allowance Model**
   - **Permit2 (Uniswap)** for granular allowances from the user to the **Universal Router**.
   - ERC-20 **`approve(Permit2, max)`** once, and **`Permit2.approve(token, UniversalRouter, amount, expiration)`** to enable router pulls.
   - The flow avoids approving the Router directly and eases allowance management.

2. **Universal Router Path**
   - Single-hop **USDC → SELVA** (buy) and **SELVA → USDC** (sell).
   - Pre-trade checks:
     - Balance/allowance sufficiency.
     - Optional dry-run / simulation (when RPC supports).
     - Slippage guard (compute `minOut` from quotes).

3. **Automation (optional)**
   - Alternating buy/sell iterations with **randomized sizes** within user-defined min/max bounds and **randomized delay** between actions (e.g., 2–3s).
   - Respect RPC rate limits and avoid excessive churn that could trigger RPC throttling.

---

## 5. Liquidity & Pricing Considerations

- **Depth matters:** Slippage and execution quality depend on how much liquidity covers the current price range.
- **Range upkeep:** If price exits the active range, the LP position stops earning fees until adjusted.
- **Rebalancing:** Operators may reposition liquidity or adjust allocations (e.g., widening ranges) as volatility changes.
- **Visibility:** Listing on aggregators and wallets (Base token list, CoinGecko/CoinMarketCap, Coinbase/Base Wallet metadata) improves discoverability but does not affect on-chain pricing.

---

## 6. Wallet & Metadata Integration

To improve UX in wallets and explorers:
- **Token logo:** publish an SVG/PNG (transparent background) and include it in token lists where supported.
- **Metadata repositories:** submit PRs to relevant lists (Base token lists, wallet registries).
- **Explorers:** ensure contract verification on BaseScan with publicly accessible source and metadata.
- **CoinGecko/CEX trackers:** provide whitepaper link (GitHub Pages), official website, social links (e.g., Telegram `t.me/selvatoken`), and pool address.

---

## 7. Security Posture

- **Key management:** treat deployer and any privileged wallets as high-risk; use hardware wallets and least privilege.
- **Approvals hygiene:** regularly review Permit2 allowances and revoke unused ones.
- **No fee-on-transfer:** ensures compatibility with Uniswap v3 Router/Pool; fee-on-transfer tokens are not supported in v3 swap math.
- **Testing:** pre-flight calls to token and pool (e.g., `transferFrom` dry-runs) help detect incompatible token logic before submitting swaps.

---

## 8. Roadmap

- **Phase 1:** Stable SELVA/USDC pool at 0.30%, documentation (this whitepaper), landing site (GitHub Pages), wallet/logo submissions.  
- **Phase 2:** Liquidity instrumentation (monitoring ranges, fees), improved automations with safety guards, community integrations.  
- **Phase 3:** Listings on major token registries, analytics dashboards, extended collateral/utility integrations where appropriate.

---

## 9. Disclaimers

- SELVA is provided “as is” with no warranties.  
- Interacting with on-chain contracts involves risk (market, smart-contract, operational, RPC).  
- Nothing in this document constitutes financial advice. Do your own research.

---

## 10. Useful Links

- **Token (BaseScan):** https://basescan.org/token/0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2  
- **Pool (Uniswap v3 0.30%):** https://app.uniswap.org/positions/v3/base/4052179  
- **Landing Page:** https://davidaugustoribeirobrazil.github.io/selva.github.io/  
- **Whitepaper (HTML):** https://davidaugustoribeirobrazil.github.io/selva.github.io/SELVA_Whitepaper_v1_noAppendix.html  
- **Whitepaper (PDF):** https://davidaugustoribeirobrazil.github.io/selva.github.io/SELVA_Whitepaper_v1_noAppendix.pdf
