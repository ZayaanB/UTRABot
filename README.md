# TrusToken

## What is TrusToken?
TrusToken is a proof-of-impact marketplace built for **UTRA Hacks**. It turns real-world sustainable or charitable actions into verifiable, on-chain “impact credits” by combining **Google Gemini** for multimodal verification, and **Solana** for minting.

A user submits evidence of a real-world good deed (through a photo) along with a short claim (e.g., “bike commute”). The backend verifies the claim using Gemini. If the claim is validated, TrusToken mints an Impact NFT on Solana. This NFT acts as a portable, auditable record of the verified action and can be displayed, traded, or redeemed for rewards.

## Problem
Many sustainability and charity initiatives struggle with one core issue: **trust**. Verifying real-world actions is hard to scale. Manual review is slow and subjective, while fully self-reported systems are easy to exploit. At the same time, impact reporting is often siloed in private databases or screenshots, making it difficult to audit, compare, or reuse across platforms.

Without measurable verification and a transparent record, incentive programs either become too expensive to run or too easy to game.

## Solution
TrusToken proposes a solution that is valuable precisely because it makes verification repeatable and consistent. Instead of relying on subjective manual review, it introduces a structured pipeline where users submit evidence (a photo, receipt, or short video) and the system checks whether that evidence supports a specific claim.

TrusToken has the potential to make sustainability and community reward programs actually work at scale, as it verifies real-world actions before rewards are given. We also aim to increase participation in low-carbon and community actions, as it turns actions into verified credits people can earn and repeat.

The process works as follows:
1. A user uploads evidence (image/video/receipt) and selects a category with a short description.
2. Gemini performs multimodal verification by checking whether the evidence matches the claim, whether the submission quality is sufficient, and whether there are fraud indicators.
3. Gemini returns a structured result (verified/not verified, confidence, flags) and generates a human-readable **impact summary**.
4. If verified, the backend mints an Impact NFT on Solana containing the category, timestamp, proof reference (URI and/or hash), and the Gemini-generated impact summary (or a reference to it).

This turns “good deeds” into verifiable digital credits that can be used in incentive systems without requiring constant manual review.

## Why TrusToken?
TrusToken’s value is enabling **credible impact incentives** at scale.

For individuals, it makes positive actions measurable and recognizable through a durable credential. For communities and organizers, it reduces manual verification overhead for challenges and campaigns (commutes, cleanups, donation drives). For partners and sponsors, it improves confidence that rewards map to legitimate actions rather than low-quality or fraudulent submissions. For transparency, it creates a public ledger of verified impact events while keeping sensitive evidence off-chain.

The broader idea is simple: if “doing good” can be verified reliably, it becomes much easier to reward and coordinate at scale.

## Intended impact
TrusToken demonstrates a pathway toward more practical sustainability incentives:
- increasing participation through lightweight rewards and recognition
- improving the credibility of impact reporting for community programs
- creating portable records that can be reused across platforms (wallets, marketplaces, partner reward portals)
- reducing administrative burden by shifting verification to an AI-assisted pipeline with clear rules

## Goals for UTRA Hacks
TrusToken is designed to compete for:
- **Best use of Gemini API:** Gemini is the core trust layer (multimodal verification, fraud/quality checks, impact summary generation).
- **Best use of Solana:** Solana is used for fast, low-fee minting and a public, auditable record of verified impact.

## How it works (technical)
### Evidence intake
Users provide evidence (photo / receipt / short video) and basic claim metadata such as category and description. Evidence is stored off-chain (e.g., object storage). The system stores references (URLs and/or hashes) needed to verify integrity without exposing sensitive data on-chain.

### Gemini verification
Gemini evaluates whether the evidence plausibly supports the claim, checks submission quality (blurry/irrelevant/incomplete), and looks for fraud indicators (mismatched context, suspicious repetition patterns). It outputs:
- `verified` (boolean or score + threshold)
- `confidence` (numeric estimate)
- `flags` (reasons for rejection or caution)
- `impact_summary` (plain-language explanation)

TrusToken is designed to keep verification consistent by using category-specific rubrics (what qualifies, what does not, and what evidence is expected).

### Solana minting
If verification passes, the backend mints an Impact NFT on Solana. Metadata includes category, timestamp, proof reference (URI and/or hash), and the impact summary (or a reference to off-chain metadata). Solana’s speed and low fees make repeated minting feasible for “micro-impact” actions.


**Supported categories:**
- **Low-Carbon Transport** : bike commute, public transport trip  
- **Waste Reduction** : recycling drop-off, reuse/refill actions  
- **Community Volunteering** : volunteering attendance proof  
- **Donation** : donation receipt/confirmation  
- **Energy Saving** : documented energy-saving action or proof  
- **Biodiversity** : planting actions, habitat-friendly activities  


### Rewards
Once minted, NFTs can represent a user’s impact history and can be made redeemable for rewards (partner perks, points, access) depending on the rules of the program. Reward logic can remain off-chain for simplicity during the hackathon.

## Trust, integrity, and privacy
TrusToken balances transparency with privacy by keeping evidence off-chain, storing hashes for integrity, and minimizing on-chain metadata. Basic anti-abuse controls can include rate limiting, duplicate detection, and repeated-submission checks. Receipts may contain personal information, so redaction or strict handling policies should be applied in production settings.

## Setup
### Prerequisites
Node.js 18+, a Gemini API key, and a Solana wallet/keypair for mint authority. Use Solana Devnet for hackathon testing.

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
