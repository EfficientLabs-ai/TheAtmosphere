<div align="center">

<img src="assets/hero.png" alt="The Atmosphere — the sovereign compute mesh" width="100%" />

# 🌐 The Atmosphere

### The sovereign compute mesh. **Unlock the compute you already own.**

<p>
<a href="https://github.com/EfficientLabs-ai/TheAtmosphere/actions/workflows/ci.yml"><img src="https://github.com/EfficientLabs-ai/TheAtmosphere/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>
<p>
<img src="https://img.shields.io/badge/license-BSL%201.1-2e8bff?style=for-the-badge" alt="License" />
<img src="https://img.shields.io/badge/status-early%20access-5bc8ff?style=for-the-badge" alt="Status" />
<img src="https://img.shields.io/badge/ports-zero%20open-0b0b0f?style=for-the-badge" alt="No open ports" />
<img src="https://img.shields.io/badge/crypto-post--quantum-8b5cf6?style=for-the-badge" alt="Post-Quantum" />
</p>
<p>
<img src="https://img.shields.io/badge/transport-Hyperswarm%20DHT-1f6feb?style=for-the-badge" alt="Transport" />
<img src="https://img.shields.io/badge/by-Efficient%20Labs-5bc8ff?style=for-the-badge" alt="Efficient Labs" />
<a href="https://efficientlabs.ai"><img src="https://img.shields.io/badge/efficientlabs.ai-→-2e8bff?style=for-the-badge" alt="Website" /></a>
</p>

**No central server to seize, censor, or surveil.**

</div>

---

## 🌍 What is The Atmosphere?

**The Atmosphere** is a peer-to-peer compute mesh. It links your machines into one private fabric
that an AI agent can run on. A node joins a public DHT and punches through NAT, so peers find each
other with **zero open ports**. Every skill that runs on the mesh is **post-quantum-signed and
verified** before it executes.

We don't believe the future of AI is *more datacenters*. We believe it's **using the compute that
already exists** — your laptop, your desktop, your team's machines — coordinated well enough to be
useful. The hard part was never raw compute. It's **coordination**: discovery, trust, identity,
proof of work done. That's what this repository is.

> *The compute already exists. We just unlock it.*

This repo publishes the **node runtime** — the program a machine runs to join the mesh and execute
verified compute. It is intentionally a small, auditable surface. The learning and economic
internals that compound on top of the mesh are **not** published (see
[the boundary](#-whats-published-vs-private)).

---

## ✨ What the published node does

| | |
|---|---|
| 🔌 **No open ports** | Public Hyperswarm DHT + NAT hole-punch. Peers connect directly — nothing to scan, nothing to seize, no inbound DDoS target. |
| 🔐 **Post-quantum verify-before-run** | A skill runs **only if** its hybrid seal (**ML-DSA-65** FIPS 204 + **Ed25519**) verifies against the pinned origin key. Both must verify, fail-closed. |
| 📡 **Proof-of-capacity** | A node can't lie about its compute — the origin times a sequential hash chain and recomputes the digest to confirm real work. |
| 🧮 **Distributed job slices** | The origin fans inputs out; each node runs the verified `compute()` over its slice and returns results. |
| 🪪 **Attribution before rewards** | Attribute a node's measured compute to a **public** Solana address. No private key, no payout logic — just the measurement basis. |
| 🛡️ **Hardened against hostile peers** | Hard frame-size cap, capacity disclosed only after auth, minimal fingerprint. |

---

## 🆚 The Cloud vs. The Atmosphere

| | ☁️ Centralized Cloud | 🌐 **The Atmosphere** |
|---|---|---|
| **Whose hardware** | Theirs (you rent it) | **Yours (you already own it)** |
| **Attack surface** | Open ports, control panels | **No open ports** |
| **Single point of failure** | The provider | **None — peer-to-peer** |
| **Egress / metering** | Billed per byte + token | **No meter** |
| **Trust model** | "Trust the provider" | **Cryptographic — verify, don't trust** |
| **Cost of local inference** | Per-token API bill | **$0 — it runs on hardware you own** |

---

## 🔄 How it works

```
1.  A node joins the public DHT and hole-punches through NAT  →  no open ports
2.  A skill arrives signed; the node verifies the PQC seal    →  verify, don't trust
3.  Tampered / wrong-origin / unsigned skills are refused     →  never executed
4.  The origin issues a proof-of-capacity challenge           →  a node can't fake its compute
5.  Verified compute runs over the node's assigned inputs     →  results return to the origin
6.  Each job is attributable to the owner's public address    →  measurement before rewards
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full protocol and
[`STATE_OF_THE_ATMOSPHERE.md`](STATE_OF_THE_ATMOSPHERE.md) for the honest L0–L5 status of every
capability.

---

## ⌨️ Run a node

**Instant proof — offline, no config, no network (~2s, any OS).** Verify the post-quantum seal that
gates every skill the mesh will ever run:

```sh
cd node-runner
npm install @noble/post-quantum   # the only dependency the proof needs
node verify.mjs                   # 5 checks: the seal verifies; every tamper is refused
```

**Join a live mesh (advanced).** This needs the full transport (Hyperswarm — a native addon; **Node 20
or 22 recommended**) and a **pinned origin key** to connect to. Create your config, then start.

bash / zsh / macOS / Linux:

```sh
cd node-runner
npm install
cp config.example.json config.json      # then set { topic, pinnedPubKey } — the origin you trust
node mesh-node.mjs                       # join the mesh, stand by for verified skills
```

Windows PowerShell:

```powershell
cd node-runner
npm install
Copy-Item config.example.json config.json
node mesh-node.mjs
```

Attribute your contribution (public address only — never a key):

```sh
node mesh-node.mjs --wallet <YOUR_PUBLIC_SOLANA_ADDRESS>
```

Full node docs: [`node-runner/README.md`](node-runner/README.md).

---

## 🔬 Verify it yourself

This is the point of publishing — you don't have to take our word for it.

**1. There is no inbound listener.** The transport is a DHT join, not a server socket:

```bash
grep -n "swarm.join\|\.listen(" node-runner/mesh-node.mjs
# → swarm.join(topicKey, { server: true, client: true })   (DHT, hole-punched)
# → no .listen() on an inbound internet port
```

**2. Skills fail closed.** Verification requires *both* signatures and returns `false` on any
mismatch — read it in `node-runner/quantum-crypto.js`:

```js
const classicalOk = crypto.verify(null, dataBuf, peer.ed25519, ...);   // Ed25519
if (!classicalOk) return false;
const pqOk = ml_dsa65.verify(...);                                     // ML-DSA-65 (FIPS 204)
if (!pqOk) return false;
return true;   // only if BOTH verify
```

**3. There are no secrets.** Grep the tree — no tokens, no private IPs, no `.env`:

```bash
grep -rIn -e "ghp_" -e "sk-" -e "BEGIN .*PRIVATE KEY" -e "\.env" node-runner/ ; echo "exit=$?"
# exit=1  (no matches)
```

---

## 🔒 What's published vs. private

We publish the **standard and the proof** — the runtime, the verifier, and an honest status — so
anyone can audit, trust, and run a node. We keep the **flywheel** private:

| Published here | Kept private (the moat) |
| :-- | :-- |
| The mesh node runtime (`node-runner/`) | The origin's orchestration + scheduler internals |
| DHT + hole-punch transport, proof-of-capacity | The mesh bootstrap configuration |
| Hybrid-PQC verify-before-run | The learning / self-improvement generation loop |
| Public-address attribution *basis* | The economic / reward accounting |

The capability-receipt **format + verifier** is published in the companion repo below.

---

## 🛰️ Runs the agent: StratosAgent

The Atmosphere is the **mesh**; **[StratosAgent](https://github.com/EfficientLabs-ai/StratosAgent)**
is the **sovereign agent** that runs on it. Use the agent alone on one machine, or mesh many
machines together with The Atmosphere.

---

## 🌐 The Efficient Labs sovereign stack

| | |
|---|---|
| 🌐 **The Atmosphere** *(you are here)* | The sovereign P2P compute mesh |
| 🛰️ **[StratosAgent](https://github.com/EfficientLabs-ai/StratosAgent)** | The sovereign agent that runs on it |
| 🔗 **[efficientlabs.ai](https://efficientlabs.ai)** | The whole story |

---

## 🤝 Contributing

We welcome issues, audits, and PRs against the public runtime. See
[`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## ⚖️ License

**Business Source License 1.1** — source-available. Free for non-production use; converts to
**Apache 2.0** on **2030-05-29**. See [`LICENSE`](LICENSE).

<div align="center">
<sub>Built by <b><a href="https://efficientlabs.ai">Efficient Labs</a></b> — sovereign AI infrastructure.<br/>
The mesh transport and PQC verify-before-run are proven across our own hardware today; adoption-grade reliability is on the roadmap. We claim only what we can measure.</sub>
</div>
