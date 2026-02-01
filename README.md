# 🪙 TrusToken

## What is TrusToken?
Trustoken is a proof-of-impact marketplace built for **UTRA Hacks**. It turns real-world sustainable or charitable actions into verifiable, on-chain “impact credits” by combining:

- AI-based verification using the Google Gemini API  
- On-chain minting and public auditability on Solana  
- A deployable backend hosted on DigitalOcean for storage and API endpoints  

How it works is that a user submits evidence of a real-world good deed (photo, receipt, or short video). The backend verifies the claim using Gemini. If the claim is validated, the system mints an Impact NFT on Solana that represents the verified action and can be displayed, traded, or redeemed for rewards.

## Problem
Many sustainability and charity initiatives struggle with one core issue: **trust**.

- Individuals and organizations want to reward positive actions, but verifying proof is time-consuming, inconsistent, and often subjective.
- Impact reporting is often siloed (private databases, screenshots, unverifiable claims), which makes auditing and interoperability difficult.
- If incentives are involved, fraud and low-quality submissions become a major risk.

Without measureable verification and a transparent record, it’s hard to build credible incentive programs for real-world impact.

## Solution
Trustoken provides a scalable verification + ledger pipeline:

1. **Evidence submission:** users upload proof of an action and provide a short description/category.
2. **Multimodal verification:** Gemini evaluates the evidence and determines whether it supports the claim.
3. **Structured verification output:** Gemini produces:
   - a pass/fail decision (or a score/threshold)
   - reasoning flags (fraud suspicion, mismatch, low-quality evidence)
   - a human-readable “impact summary”
4. **On-chain minting:** verified claims are minted as Impact NFTs on Solana with metadata linking to the proof and the verification summary.

This creates a consistent and automatable process for turning real-world actions into verifiable digital credits.

## Why TrusToken?
TrusToken’s value is enabling **credible impact incentives** at scale:

- **For individuals:** it makes positive actions measurable and recognized with a durable credential.
- **For communities and organizers:** it supports challenge campaigns (e.g., commuting, cleanups, donation drives) with less manual review.
- **For partners and sponsors:** it enables reward programs with stronger guarantees that rewards correspond to legitimate actions.
- **For transparency:** it creates a public, auditable trail of verified impact events (while keeping sensitive media off-chain).

The broader implication is that “doing good” can be integrated into incentive systems without collapsing under manual verification costs or widespread fraud.

## Intended impact
TrusToken demonstrates a pathway toward:

- Better participation in sustainability initiatives through lightweight rewards
- More trustworthy impact reporting for community programs
- Transparent records that can be reused across platforms (wallets, marketplaces, partner reward portals)
- Reduced administrative burden by shifting verification to an AI-assisted pipeline with clear criteria

## Goals for UTRA Hacks
Trustoken is designed to compete for:
- **Best use of Gemini API:** Gemini is the core verification engine (multimodal analysis, fraud detection, summary generation).
- **Best use of Solana:** Solana is used for minting verifiable, low-fee, fast-to-issue Impact NFTs and for public transparency.

## How it works (technical)
### 1) Evidence intake
Users provide:
- Evidence: photo / receipt image / short video
- Claim metadata: category (e.g., “bike commute”), short description, optional contextual fields (time, location region, etc.)

Evidence is stored off-chain (e.g., object storage). The system stores references (URLs and/or hashes) needed to verify integrity.

### 2) Gemini verification
Gemini performs multimodal verification by evaluating:
- Whether the evidence plausibly matches the category and description
- Evidence quality (is it too blurry, irrelevant, incomplete?)
- Potential fraud indicators (reused images, inconsistent context, suspicious patterns)

Gemini outputs structured information such as:
- `verified`: boolean (or score + threshold)
- `confidence`: numeric estimate
- `flags`: list of reasons for rejection or caution
- `impact_summary`: plain-language explanation of the verified action

A strong design choice is to keep the verification rubric consistent and category-based:
- Each category can have guidelines (what qualifies, what does not, what evidence is expected).
- This reduces ambiguity and improves repeatability.

### 3) Minting on Solana
If verification passes:
- The backend triggers minting of an “Impact NFT” on Solana.
- NFT metadata includes:
  - impact category and timestamp
  - a proof reference (URI) and/or content hash
  - the Gemini-generated impact summary (or a hash + off-chain metadata URI)
  - verification attributes (confidence band, flags cleared)

Solana’s speed and fee structure make it practical for “micro-impact” actions where frequent minting must remain cheap.

### 4) Rewards and marketplace behavior
Once minted, NFTs can be:
- Displayed as a user’s impact history
- Traded (if the design allows transferability)
- Redeemed for partner rewards (coupon codes, points, access, etc.)

Reward logic can remain off-chain or be partially on-chain depending on scope.

## Trust, integrity, and privacy considerations
Trustoken is a “proof of impact” system, so it must balance transparency and privacy:

- **Off-chain media storage:** evidence is not stored on-chain to avoid leaking personal details.
- **Content hashing:** store hashes so the evidence can be integrity-checked without publishing it.
- **Minimal metadata on-chain:** include only what is needed for auditability and replay prevention.
- **Fraud controls:** rate limits, duplicate detection (hashing), and repeated-submission checks can reduce abuse.
- **Sensitive data handling:** receipts may contain personal info; consider redaction or rules that forbid sensitive fields.

### Prerequisites
- Node.js 18+ (recommended)
- A Gemini API key
- Solana wallet/keypair for mint authority
- Solana RPC URL (Devnet recommended)

### Environment variables
Create a `.env` based on `.env.example` and add:
- `GEMINI_API_KEY=...`
- `SOLANA_RPC_URL=...`
- `SOLANA_WALLET_SECRET=...`
- Storage variables for media hosting (if applicable)

### Install and run
```bash
npm install
npm run dev
