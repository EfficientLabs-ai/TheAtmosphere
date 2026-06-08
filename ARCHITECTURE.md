# The Atmosphere — Mesh Node Architecture

**Status:** mixed CURRENT / TARGET · honest by default
**Scope:** this document describes the **public mesh node runtime** in this repository
(`node-runner/`). It does not describe Efficient Labs' private orchestration, learning, or
economic internals — those are deliberately not published.

> **Honesty rule:** every capability below is **CURRENT** (in the code in this repo, file cited)
> or **TARGET** (specified, not built here). We claim only what the published code does.

---

## What this repo is (CURRENT)

The Atmosphere is a peer-to-peer compute mesh. This repository publishes the **node runtime** —
the program a machine runs to join the mesh and execute verified compute. It is a single
self-contained directory:

| File | Role |
| :-- | :-- |
| `node-runner/mesh-node.mjs` | The mesh peer: DHT join, NAT hole-punch, proof-of-capacity, verified-skill execution, capability attribution. |
| `node-runner/wasm-sections.js` | Dependency-free WebAssembly custom-section parser (reconstructs the signed byte region). |
| `node-runner/quantum-crypto.js` | Hybrid PQC suite — X25519 + ML-KEM-768 (FIPS 203) and Ed25519 + ML-DSA-65 (FIPS 204). |
| `node-runner/config.example.json` | The shape of a node's `config.json` (topic + pinned origin key). |

There is **no central server** in this model. A node announces itself on a public DHT and peers
hole-punch directly to each other.

---

## The transport (CURRENT)

```
node                                   origin / peer
 │  join(topicKey, server+client)          │
 │ ───────── announce on public DHT ──────▶│
 │ ◀──────── NAT hole-punch (Hyperswarm) ──│
 │                                          │
 │ ◀──────── signed WASM skill ────────────│
 │  verify PQC seal vs pinned origin key    │
 │  (refuse if invalid / wrong origin)      │
 │ ───────── capability report ───────────▶│
 │ ◀──────── CHALLENGE (nonce, iters) ──────│
 │  run sequential SHA-256 chain            │
 │ ───────── PROOF (digest, time) ────────▶│
 │ ◀──────── JOB (input slice) ────────────│
 │  run verified compute() over inputs      │
 │ ───────── RESULT (slice) ──────────────▶│
```

- **No open ports.** The node calls `swarm.join(topic, { server: true, client: true })` and lets
  the DHT coordinate the hole-punch. Nothing listens on an inbound internet port.
- **Length-framed reader with a hard size cap.** A peer that declares an oversized frame has its
  socket destroyed before any buffer is allocated — a DoS guard on an untrusted stream
  (`MAX_SKILL_BYTES = 1 MiB`).
- **Fingerprint minimization.** The node discloses only its operator-chosen `nodeLabel`,
  hardware class, and a measured benchmark — and only **after** a peer has proven it holds an
  origin-signed skill.

---

## Verify, don't trust (CURRENT — keystone)

A skill is a WebAssembly module carrying two custom sections: a **pathway manifest**
(`stratos.gsi.pathway`) and a trailing **signature** section (`stratos.gsi.signature`).

1. `findCustomSectionRange` locates the signature section and reconstructs the exact byte prefix
   that was signed (everything before the signature).
2. `verifyPayload` checks the **Ed25519** signature *and* the **ML-DSA-65** signature against the
   **pinned origin public key**. Both must verify; any tamper, wrong origin, or missing section
   **fails closed** and the skill is never executed.
3. Only a fully verified module is instantiated. `compute(x)` is cached and reused for dispatched
   job slices.

This is hybrid post-quantum: an attacker would have to break **both** a classical and a
lattice-based scheme to forge a skill.

---

## Proof-of-capacity (CURRENT)

Self-reported specs are trustworthy for your own fleet, but a public mesh needs proof. The origin
sends a `CHALLENGE` with a random nonce and an iteration count; the node runs an inherently
**sequential** SHA-256 hash chain that many times and returns the digest + wall-time. The origin
recomputes the digest to confirm the work happened, and the time bounds real throughput from
below. A node can under-report but **cannot claim more compute than it physically has**.

---

## Attribution before rewards (CURRENT format / TARGET economy)

Each verified job a node completes is attributable to the node owner's **public Solana address**
(`--wallet` / `config.walletAddress`). The address is validated (base58, 32–44 chars) and is
**public** — this code path never touches a private key, and there is **no price or payout logic
anywhere in this repository**. It records the *basis* for attribution so that, if and when a
reward layer ships, contribution is already measured.

The capability-receipt format and verifier (the tamper-evident, hash-chained, PQC-signed record
of who did what) is published in the companion **StratosAgent** repository. The reward/economy
itself is **TARGET** and intentionally not published.

---

## What is intentionally NOT here (the boundary)

This repo is the **public node runtime** only. Not published:

- The origin's private orchestration, scheduler internals, and mesh bootstrap configuration.
- The learning / self-improvement *generation* loop (the compounding flywheel).
- Any economic / reward accounting math.
- Private connectors, brokers, identity, and execution internals.

> Rule of thumb: we publish the **standard + the proof** (the runtime, the verifier, the honest
> status) so anyone can audit, trust, and run a node — and we keep the **flywheel** private.

---

## Current-vs-Target (one line)

**CURRENT (in this repo):** public DHT + NAT hole-punch transport with no open ports;
hybrid-PQC (ML-DSA-65 + Ed25519) verify-before-run skill execution; proof-of-capacity
challenge/response; per-job distributed compute slices; public-address compute attribution.
**TARGET:** one-command join, a live mesh dashboard, adoption-grade monitoring/recovery, a GPU
burst tier, and the measurement→attribution ledger economy. Nothing is claimed live until it is.
