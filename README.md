# SELVA — ERC-20 Token on **Base** (Hardhat Monorepo)

**SELVA** is a minimal, auditable ERC-20 with EIP-2612 Permit (no fees, no blacklist, no rebase), deployed on **Base**.  
This repository contains the smart contracts, Hardhat setup, deployment/verification scripts, and docs (whitepaper + site).

> ⚠️ Exchange/wallet listings depend on third-party criteria (risk, compliance, liquidity). A simple & verified contract helps, but **does not guarantee listing**.

---

## Quick links

- **Website (GitHub Pages):** https://davidaugustoribeirobrazil.github.io/selva.github.io/
- **Token (BaseScan):** https://basescan.org/token/0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2
- **Contract (BaseScan address):** https://basescan.org/address/0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2
- **Primary Pool (Uniswap v3 0.30%):** https://app.uniswap.org/positions/v3/base/4052179
- **Whitepaper:**  
  - **Markdown:** [`docs/whitepaper.md`](docs/whitepaper.md)  
  - **HTML:** [`docs/SELVA_Whitepaper_v1_noAppendix.html`](docs/SELVA_Whitepaper_v1_noAppendix.html)  
  - **PDF:** [`docs/SELVA_Whitepaper_v1_noAppendix.pdf`](docs/SELVA_Whitepaper_v1_noAppendix.pdf)
- **Logos (SVG/PNG):** [`logos/`](logos/)

---

## Contract summary

- **Standard:** ERC-20 + **EIP-2612 Permit**
- **Symbol / Decimals:** `SELVA` / `18`
- **Supply model:** Fixed (all minted once in constructor)
- **Fees / blacklist / rebase:** **None**
- **Ownership:** `Ownable`
  - Recommended: set a **multisig** as owner (Gnosis Safe / Safe)
  - Or renounce ownership if you don’t need privileged actions
- **Chain:** Base (mainnet)

---

## Repository layout

## Onde me encontrar

- Twitter/X: https://twitter.com/selvaonbase
- Telegram: https://t.me/selvaonbase

  ## Onde me encontrar

[![Twitter/X](https://img.shields.io/badge/Follow-%40selvaonbase-black?logo=x&logoColor=white)](https://twitter.com/selvaonbase)
[![Telegram](https://img.shields.io/badge/Telegram-selvaonbase-blue?logo=telegram)](https://t.me/selvaonbase)



