# SELVA — Technical Overview (v1.0)

**Chain:** Base (Mainnet)  
**Token Address:** `0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2`  
**Standard:** ERC-20 (18 decimals)

## 1. Purpose
SELVA is an ERC-20 token on Base designed for utility within the SELVA ecosystem, including Uniswap v3 liquidity provisioning and integrations with compatible wallets and tools.

## 2. Tokenomics
- **Total Supply:** Fixed at launch (or specify exact cap).  
- **Mint/Burn:** (Describe: disabled / ownerless / or precise rules.)  
- **Transfer Fees:** None (fee-on-transfer = **0%**) — DEX-friendly (Uniswap v3 compatible).  
- **Ownership / Admin Keys:** (Describe: renounced / time-locked / multisig; include addresses if applicable.)  
- **Treasury/Reserves:** (If any, % and purpose: liquidity, development, ops.)

## 3. Smart Contracts
- **Token (SELVA):** `0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2`  
- **Primary DEX Pair (Uniswap v3, 0.3%):** `0xF109456223621006e35A66f4Fb5f934E0E63de09`  
- **Router(s):** Uniswap v3 / Universal Router (Base)

## 4. Liquidity Strategy
- Concentrated liquidity on Uniswap v3 (fee tier 0.3%).  
- Targets: tight spreads for USDC↔SELVA, periodic rebalancing when price drifts from active ticks.  
- No transfer taxes to preserve swap & LP UX.

## 5. Security
- **Honeypot Protections:** not applicable; transfers unrestricted; compatible with routers/pools.  
- **Audits:** (Link if any; otherwise “Pending” or “Community-reviewed”.)  
- **Timelocks/Multisig:** (If used, specify addresses & delay.)

## 6. Roadmap (High-level)
- Phase 1: Liquidity & Wallet integrations  
- Phase 2: Tooling for LP analytics and auto-rebalancing  
- Phase 3: Ecosystem utilities (integrations/partnerships)

## 7. Disclaimers
This document is informational and does not constitute financial advice. Digital assets are volatile and may involve risk of loss. DYOR.
