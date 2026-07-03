# ARCHITECTURE AUDIT — `TheAtmosphere` (public)

> **Repo:** `EfficientLabs-ai/TheAtmosphere` — the public **P2P compute-mesh node-runner** for Efficient Labs' Atmosphere, BSL 1.1. A carved subset: the mesh *peer + offline verifier*, with the origin/signing side and the reward economy deliberately private.
> **Method:** read-only inspection of `main` (`dac8e51`); all four source files read in full; every claim cites `path:line`. Secrets never read (`.gitignore` excludes `.env*`, `*.key`, `*.pem`, `.secrets-vault/`; grep clean).
> **Key framing:** **wired** vs **stub** vs **private-by-design seam**, plus **needs-external-native-dep**. The repo is **15 tracked files**; the published package is `@efficientlabs/atmosphere-mesh-node` v1.0.0 rooted at `node-runner/`.

---

## 1. Current Folder Structure

```
TheAtmosphere/                         (NO root package.json — single-package project rooted at node-runner/)
├── .github/workflows/ci.yml           787B   proof-only CI (no native dep)
├── ARCHITECTURE.md  6.3K   CONTRIBUTING.md 2.3K   README.md 8.9K   STATE_OF_THE_ATMOSPHERE.md 2.9K
├── LICENSE  1.85K  (BSL 1.1)
├── assets/hero.png  ~2.3MB  (README banner)
└── node-runner/                       @efficientlabs/atmosphere-mesh-node v1.0.0 · ESM · bin: atmos-node
    ├── mesh-node.mjs        13.6K     the self-installing mesh peer (only executable entry)
    ├── quantum-crypto.js     6.7K     hybrid PQC suite (Ed25519+ML-DSA-65 / X25519+ML-KEM-768)
    ├── verify.mjs            2.5K     offline trust-core proof (the `npm test` / CI job)
    ├── wasm-sections.js      3.3K     dependency-free WASM custom-section parsing
    ├── README.md             3.9K
    ├── package.json          805B     deps: hyperswarm@4.17.0, b4a@1.8.1, @noble/post-quantum@0.6.1
    └── config.example.json   378B     topic + pinnedPubKey + optional wallet template
```

**Dependency strategy (split by need):** `b4a` and `@noble/post-quantum` are pure-JS top-level imports (always available); **`hyperswarm` is a native addon, lazy-`require`d** *after* config load via `createRequire`, wrapped in try/catch with a friendly message + `process.exit(4)` on a missing prebuild (`mesh-node.mjs:174-184`). The offline proof (`verify.mjs`) needs **only** `@noble/post-quantum` — which is why CI installs just that one package.

---

## 2. Current Responsibilities

- **`mesh-node.mjs`** — the self-installing mesh peer and only entrypoint. Loads `config.json` (topic + pinned origin key + optional wallet, `:28-41`), validates an optional **public** Solana address by base58 regex and refuses to start if invalid (`:53-67`), derives the DHT topic as `sha256(topicName)` (`:70`), lazy-loads Hyperswarm, and `swarm.join(topicKey, {server:true, client:true})` with **no inbound listener** (`:252`). Per connection: length-framed reader with a **1 MiB hard cap** (`:80-96,190`); routes JSON control frames (`CHALLENGE`→proof-of-capacity, `UPDATE_AVAILABLE`, `JOB`→compute slice; `:200-220`) vs WASM skill frames (first byte `0x00`). A WASM skill runs **only** if `verifySignedSkill` passes (`:135-146,224-228`); then discloses a measured capability report once and instantiates the module, caching `compute(x)` for jobs.
- **`quantum-crypto.js`** — hybrid classical+PQC suite: keypair gen, import/export, a hybrid KEM (X25519+ML-KEM-768 via HKDF-SHA256, `:77-115`), hybrid sign/verify (Ed25519+ML-DSA-65). `verifyPayload` (`:137-165`) is the keystone — **both** halves must pass or returns `false` (fail-closed).
- **`verify.mjs`** — self-contained **offline proof** of the trust core (no network/Hyperswarm/native addon): generates origin + attacker keypairs, signs a sample skill, asserts a correct seal verifies and **four tampers are each refused** (`:36-48`); non-zero exit on any wrong result.
- **`wasm-sections.js`** — dependency-free WASM custom-section parsing. `parseCustomSection` returns a named section's bytes; `findCustomSectionRange` also returns `sectionStart`, used to reconstruct the exact signed byte-prefix (everything before the trailing `stratos.gsi.signature` section). Extracted as a pure refactor from the private `gsi-compiler.js`.

---

## 3. Existing Systems

| System | Path | State |
|---|---|---|
| P2P mesh node (Hyperswarm DHT + hole-punch, no open ports) | `mesh-node.mjs:174-253` | **Wired**, **needs native dep** (`hyperswarm`, lazy-required with graceful failure). No `.listen()` anywhere. |
| Hybrid PQC crypto (sign/verify + KEM) | `quantum-crypto.js` | **Wired & functional** (pure-JS `@noble/post-quantum`). KEM implemented but **not called in-repo** (private seam for the origin). |
| Capability / signed-skill verify | `verifySignedSkill` (`mesh-node.mjs:135-146`) + `wasm-sections.js` | **Wired** — verifies `stratos.gsi.pathway`+`signature` sections against the pinned key. The **signing/origin side is private**. |
| Proof-of-capacity + capability report + JOB slices | `mesh-node.mjs:102-161,197-249` | **Wired (node side)** — the **origin** that issues CHALLENGE/JOB and recomputes digests is **private** (half the loop, by design). |
| WASM handling | `wasm-sections.js` + `WebAssembly.instantiate` (`mesh-node.mjs:241`) | **Wired**, dependency-free. |
| Wallet attribution | `mesh-node.mjs:49-67,124` | **Wired** — public-address validation + inclusion in the capability report. **No payout/economy logic** anywhere (intentional). |

---

## 4. Existing Harness Components

No test framework. The only "test" is **`verify.mjs`** — a hand-rolled `check(name, cond)` asserter (`:21-24`) wired as `npm test`/`npm run verify`. `mesh-node.mjs --once` is a runtime proof mode (`:13,45,247,255`). No Jest/Mocha/Vitest, no `test/` dir.

## 5. Existing Context Systems

**Not present.** No prompt/context/LLM machinery — the runtime moves WASM bytes + JSON control frames over a socket. The repo is the mesh transport + verifier, not an agent.

## 6. Existing Memory Systems

**Minimal and ephemeral by design.** No DB, no on-disk identity, no keypair persistence in the runtime path. Persistence = read-only `config.json` at startup (`topic`, `pinnedPubKey` trust anchor, optional `walletAddress`/`nodeLabel`/`defaultInput`, `:28-41`); the rest is in-process caches (`_cap`, per-connection `computeFn`). The node's network identity is the **Hyperswarm-derived public key** (logged `:192`), managed by Hyperswarm, not persisted by this code. No write-back to disk anywhere.

## 7. Existing Agent Systems

**None.** No agent loop, planner, tool-calling, or LLM. The node is a passive verify-and-execute peer (stand by → verify signed WASM → run `compute(x)` → answer JOB slices). The actual agent (StratosAgent) is a separate repo.

## 8. Existing Tool Systems

- **`verify.mjs`** — offline seal verifier / proof tool; 5 fail-closed checks. Wired, runs in CI.
- **`wasm-sections.js`** — WASM custom-section parse/range tool (locates/extracts sections, reconstructs the signed prefix; not full module validation). Wired.
- **`quantum-crypto.js`** PQC suite — algorithms confirmed: **Ed25519** + **X25519** (native `node:crypto`), **ML-DSA-65** (FIPS 204) + **ML-KEM-768** (FIPS 203) via `@noble/post-quantum`. Hybrid KEX (X25519+ML-KEM-768, HKDF-SHA256) + hybrid sigs (Ed25519+ML-DSA-65, both-must-verify). Sign/verify wired; **KEM implemented but unused in-repo** (private seam).

## 9. Existing MCP Integrations

**None.** Grep across all `.js/.mjs/.md` for MCP / "model context protocol" → no matches. No MCP server, client, or config.

## 10. Existing Automation Systems

One workflow: `.github/workflows/ci.yml` — push/PR/`workflow_dispatch`; one job `proof` across a **6-cell matrix** ({ubuntu,windows,macos}×{20,22}, `fail-fast:false`), `working-directory: node-runner`. Steps: checkout → setup-node → **`npm install @noble/post-quantum@^0.6.1`** (only that one lib — deliberately bypasses `npm install`/native `hyperswarm`) → `node verify.mjs`. **CI exercises the offline trust core only** (the 5 seal checks); it does **not** test the live DHT transport, proof-of-capacity, or JOB path. No lint, no build.

## 11. Existing Governance Systems

- **LICENSE** — BSL 1.1; Licensor Efficient Labs; Change Date **2030-05-29** → Apache 2.0; production use only within Atmosphere/StratosAgent; forked Holepunch components retain their own license. *(Minor: SPDX `"BUSL-1.1"` in `package.json` vs prose "BSL 1.1".)*
- **STATE_OF_THE_ATMOSPHERE.md** — honest **L0–L5** matrix: DHT join + PQC verify-before-run at **L4** ("proven cross-machine **on our own hardware**" — a real but *own* fleet, not public/third-party); WASM parse / proof-of-capacity / job slices / attribution / DoS guard / receipt format at **L3** (hermetic/local); one-command join / dashboard / monitoring / ledger economy at **L1**; GPU tier **L0–L1**; reward economy explicitly TARGET + **private** (`:34`). Consistent with code (no payout logic; KEM/origin signing absent).
- **README honesty** — strong: a runnable "Verify it yourself" grep section (`:140-164`), an explicit published-vs-private boundary table (`:168-182`), and a footer caveat that mesh+PQC are "proven across **our own** hardware today; adoption-grade reliability is on the roadmap." No claim of a large public fleet. The "no open ports / DHT hole-punch" claim is substantiated by code (`swarm.join`, no `.listen()`).
- **CONTRIBUTING.md** — scopes contributions to the public runtime, declares the private moat out of scope, restates the CURRENT/TARGET honesty rule, mandates no-secrets/no-private-IPs, gives a private security channel (`security@efficientlabs.ai`).

---

## 12. Missing Components

**(A) Missing-by-design — private seams (correctly absent; documented):**
1. The **origin / signing side** — issuing CHALLENGE/JOB, signing skills, recomputing digests (the node verifies but never originates).
2. The **hybrid KEM** is implemented + exported but **unused in-repo** — for the private origin/StratosAgent.
3. The **reward economy / payout / ledger** — L0, private (the node validates a public wallet address but settles nothing).

**(B) Genuinely incomplete / friction (in-scope gaps):**
4. **No committed lockfile** — `node-runner/package.json` pins exact versions but no tracked `package-lock.json`, so `npm install` isn't reproducible from the committed tree.
5. **No root `package.json`** — a user can't `npm install` from root; the run story requires `cd node-runner` first, and the two install paths diverge (offline proof = 1 dep; live mesh = full install incl. native `hyperswarm`).
6. **CI never exercises the live transport** — only the offline seal proof runs; the DHT join / proof-of-capacity / JOB path has no automated test.
7. **No persistence/telemetry/monitoring** — swallowed socket/parse errors are invisible to an operator (L1 "adoption-grade monitoring" gap).
8. **Static capability specs are self-reported** — proof-of-capacity covers *throughput*, not static cores/RAM/CPU claims (acknowledged in-code).

---

## 13. Duplicate Components

1. **`quantum-crypto.js` is byte-identical (6,744 B) here and in StratosAgent** — the same PQC primitive carved into both public repos (and the private core). Three copies that can drift; a single shared source (or a tiny published `@efficientlabs/atmos-crypto`) would fix it.
2. **`wasm-sections.js`** was extracted from the private `gsi-compiler.js` — a deliberate pure refactor, but now a second copy of that parsing logic to keep in sync with the private original.

---

## 14. Technical Debt

- **No tracked lockfile** → non-reproducible installs (see §12.4).
- **Native-addon / ABI fragility** — `hyperswarm` has no fallback; code warns "newer Node may lack a prebuild," exits `4` on failure; `engines.node >=20` but CI only tests 20 & 22, so **Node ≥24 is unproven** and likely hits the missing-prebuild path. Handled gracefully, not solved.
- **Version drift** — runtime banner `NODE_VERSION = '1.2.0'` (`mesh-node.mjs:148`) disagrees with `package.json` version `1.0.0` (`:3`).
- **No TODO/FIXME/HACK/mock markers** in source (grep clean); `config.example.json` angle-bracket placeholders are intended template values.
- **Silent error-handling** — `socket.on('error', ()=>{})` (`:194`), ignored control-frame JSON parse errors (`:220`), un-retried failed capability report (`:239`): defensive on an untrusted stream, but failures are invisible (no logging/telemetry).
- **Unused exported KEM surface** — `encapsulate/decapsulate/generateHybridKeyPair`/import bundles are dead within this repo and **not exercised by CI** (`verify.mjs` tests only sign/verify) — intentional private seam, but untested code paths.
- **Hardcoded constants** (all reasonable, none secret): 1 MiB skill cap, PoC iteration cap `20_000_000`, job input cap `100_000`, `--once` timeout `90_000ms`, default topic `atmosphere-genesis-mesh-v1`.
- **Docs↔code: tightly aligned** — the only drifts are the `1.2.0`/`1.0.0` version mismatch and the informal "BSL 1.1"/"BUSL-1.1" labeling. No secret values anywhere.

---

## 15. Recommendations

*(Remediation of what exists — no new architecture.)*

**P1 — supply chain & honesty (cheap, high-value)**
1. **Commit a `package-lock.json`** for `node-runner/` so installs are reproducible.
2. **Fix the version drift** — make `NODE_VERSION` derive from (or match) `package.json` `version` so the banner can't lie.
3. **Document/declare the Node ABI window** — pin a tested range and state Node ≥24 is unproven (or add it to the matrix once `hyperswarm` prebuilds exist).

**P2 — close the test/observability gaps**
4. **Add a live-transport smoke test** (two local nodes over a loopback DHT, or a documented manual proof) so CI covers more than the offline seal, or explicitly state in CI that transport is untested.
5. **Exercise the KEM path** in `verify.mjs` (or note it's an unused export) so no shipped crypto path is untested.
6. **Make swallowed errors observable** — an optional `--verbose`/logger so operators can see socket/parse/report failures (the L1 monitoring gap).

**P3 — structure**
7. **Extract the shared PQC primitive** to one source consumed by TheAtmosphere + StratosAgent + the private core (ends the 3-way `quantum-crypto.js` copy); same for keeping `wasm-sections.js` synced with the private `gsi-compiler.js`.
8. Add a **root README pointer** (or a thin root `package.json`) so the `cd node-runner` install story is unmissable.

---

*End of audit. Reflects `main` at `dac8e51`. No code modified; all four source files read in full; no secret values present or read.*
