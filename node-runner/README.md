# Atmosphere Mesh Node

A self-contained mesh node that lets any machine join the **Atmosphere** sovereign compute mesh
with minimal setup. The node joins the **public Hyperswarm DHT via NAT hole-punching** — it opens
**no inbound port** and exposes **no public internet surface**. It runs a compute skill **only
if** the skill's hybrid post-quantum seal (**ML-DSA-65 + Ed25519**) verifies against the
**pinned origin public key** in `config.json`. Unsigned / tampered / wrong-origin skills are
refused and never executed.

This directory is fully self-contained: `mesh-node.mjs` and its two dependency-free verifier
modules (`wasm-sections.js`, `quantum-crypto.js`) ship together, so a device validates a skill
block with the **exact same code path** the origin uses to sign it.

## Install

```bash
npm install
```

Dependencies: `hyperswarm` (DHT + hole-punch transport), `b4a` (buffer helpers), and
`@noble/post-quantum` (audited pure-JS FIPS 203/204 — ML-KEM-768 + ML-DSA-65).

## Configure

Copy the example and fill in your topic + pinned origin key:

```bash
cp config.example.json config.json
```

| Field | Meaning |
| :-- | :-- |
| `nodeLabel` | Operator-chosen label (the only identity the node discloses). |
| `topic` | Rendezvous string — peers on the same topic find each other on the DHT. |
| `defaultInput` | Default input for the verified compute skill in `--once` proof mode. |
| `walletAddress` | *Optional.* Your **public** Solana address — attributes this node's measured compute to you. Never a private key. |
| `pinnedPubKey` | The base64-encoded origin public-key bundle — your **trust anchor**. |

`config.json` holds your trust anchor — keep it private. See `config.example.json` for the shape.

## Run

```bash
node mesh-node.mjs            # join the mesh and stand by for verified skills
node mesh-node.mjs --once     # run one verified skill and exit (proof mode)
node mesh-node.mjs --input 21 --once   # proof mode with a specific input
```

## Attribute your compute to your wallet (`--wallet`)

Attribute every verified job your node completes to your **public Solana address** — connect and
attribute in one command:

```bash
node mesh-node.mjs --wallet <SOL_ADDRESS>
```

This is **measurement before rewards**: the origin records your address in the `owner_wallet` field of
each PQC-signed, hash-chained Capability Receipt, so the day a reward layer launches your node is
**already attributed** on the basis of measured contribution alone. A wallet **address is public**
and safe to advertise; this **never touches a private key**, and there is **no price/payout logic**
anywhere — only the attribution basis. The address is validated (base58, 32–44 chars); an invalid
one is refused at startup. Omit `--wallet` and the node still joins, logging
`unattributed (no wallet)`. You can also set `"walletAddress"` in `config.json` (the `--wallet`
flag overrides it).

## How verification works

1. A skill arrives as a WebAssembly module with two custom sections: a pathway manifest and a
   trailing signature section.
2. `wasm-sections.js` parses those sections (dependency-free, identical to the compiler's parser)
   and reconstructs the exact byte prefix that was signed.
3. `quantum-crypto.js` `verifyPayload` checks **both** the Ed25519 and the ML-DSA-65 signatures
   against the pinned origin public key. Both must verify — it fails closed on any mismatch.
4. Only a fully verified skill is instantiated and executed. Everything else is refused.

## Proof-of-capacity

When the origin sends a `CHALLENGE` (a random nonce + an iteration count), the node runs a
sequential SHA-256 hash chain that many times and returns the digest + wall-time. The origin
recomputes the digest to confirm the work was actually done; the time gives a **proven lower
bound** on real throughput. A node can under-report but cannot claim more compute than it has.
