# State of The Atmosphere — Honest Status

**Last updated:** 2026-06-07 · **Scope:** the public mesh node runtime in this repository.

This is the honest, current state of what the **published** code does. We use a maturity scale so
claims are unambiguous. We claim only what we can measure.

## Maturity scale

| Level | Meaning |
| :-- | :-- |
| **L0** | Idea only — not designed. |
| **L1** | Designed / specified — interface or doc exists, no code. |
| **L2** | Built — code exists in this repo. |
| **L3** | Tested — exercised by a hermetic/local test. |
| **L4** | Proven across real hardware — run on more than one physical machine. |
| **L5** | Adoption-grade — monitored, recoverable, documented for third-party operation. |

## Component status

| Capability | Level | Where / note |
| :-- | :-- | :-- |
| Public DHT join + NAT hole-punch (no open ports) | **L4** | `node-runner/mesh-node.mjs` (Hyperswarm). Proven cross-machine on our own hardware. |
| Hybrid-PQC verify-before-run (ML-DSA-65 + Ed25519) | **L4** | `quantum-crypto.js` `verifyPayload`, fail-closed. Same code path the origin signs with. |
| WASM custom-section parsing (signed-region reconstruction) | **L3** | `wasm-sections.js`, dependency-free. |
| Proof-of-capacity challenge/response | **L3** | Sequential SHA-256 hash chain, timed and digest-verified by the origin. |
| Distributed compute job slices | **L3** | `JOB` → run verified `compute()` over inputs → `RESULT`. |
| Public-address compute attribution (`--wallet`) | **L3** | Validated base58 Solana address; public-only; no payout logic present. |
| Frame DoS guard (hard size cap, socket destroy) | **L3** | `frameReader` with `MAX_SKILL_BYTES`. |
| Capability-receipt format + verifier | **L3** | Published in the **StratosAgent** repo (companion). |
| One-command join + live mesh dashboard | **L1** | TARGET — roadmap. |
| Adoption-grade monitoring / graceful recovery | **L1** | TARGET — roadmap. |
| GPU burst tier | **L0–L1** | TARGET — horizon. |
| Measurement → attribution ledger economy | **L1** | Format is L3 (StratosAgent); the reward economy is TARGET and **private**. |

## What's deliberately not here

The private orchestration, the learning/self-improvement generation loop, the economic/reward
accounting, and the origin's mesh bootstrap configuration are **not** published. See
[`ARCHITECTURE.md`](ARCHITECTURE.md) for the published boundary.

## How to verify these claims yourself

1. Read `node-runner/mesh-node.mjs` — there is no inbound `.listen()`; the transport is
   `swarm.join(topic, { server: true, client: true })`.
2. Read `quantum-crypto.js` `verifyPayload` — both Ed25519 and ML-DSA-65 must verify; it returns
   `false` on any mismatch.
3. Grep this repo for private IPs, tokens, or `.env` references — there are none. (See
   [`README.md`](README.md) → "Verify it yourself".)
