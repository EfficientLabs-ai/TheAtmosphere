# Contributing to The Atmosphere

Thanks for your interest in The Atmosphere. This repository publishes the **public mesh node
runtime**. We welcome issues, security audits, and pull requests against that surface.

## Scope of this repository

This repo is intentionally a small, auditable surface: the node runtime under `node-runner/`, the
architecture docs, and the honest status. Efficient Labs' private orchestration, the
learning/self-improvement loop, and the economic/reward internals are **not** published and are out
of scope here. PRs that try to reconstruct those will be closed.

## What's especially welcome

- **Security review.** This is verify-before-run code on an untrusted P2P stream. If you find a
  way to get an unsigned, tampered, or wrong-origin skill to execute, that is a real bug — please
  report it (see below).
- **Transport robustness.** NAT-traversal edge cases, DHT behavior, framing/DoS hardening.
- **Portability.** Making the node run cleanly across more platforms and Node versions.
- **Docs honesty.** If a claim in the README, `ARCHITECTURE.md`, or `STATE_OF_THE_ATMOSPHERE.md`
  overstates what the code does, a correction PR is very welcome. We hold the honesty line hard.

## Honesty rule

Every capability we document is labeled **CURRENT** (in this repo, file cited) or **TARGET**
(specified, not built here). Do not add a claim the published code can't back up. See the L0–L5
maturity scale in [`STATE_OF_THE_ATMOSPHERE.md`](STATE_OF_THE_ATMOSPHERE.md).

## Local setup

```bash
cd node-runner
npm install
node mesh-node.mjs --once   # proof mode
```

## Pull requests

1. Fork and branch from `main`.
2. Keep changes focused and the diff small.
3. Never commit secrets, private IPs, tokens, `.env` files, or anything from the private moat.
   PRs are scanned; anything secret-bearing is rejected.
4. Match the existing style; explain *why* in the PR description, not just *what*.

## Reporting a security issue

**Do not open a public issue for a vulnerability.** Email **security@efficientlabs.ai** with
details and a reproduction. We will acknowledge and work with you on a coordinated disclosure.

## License

By contributing, you agree your contributions are licensed under the repository's **Business Source
License 1.1** (see [`LICENSE`](LICENSE)).
