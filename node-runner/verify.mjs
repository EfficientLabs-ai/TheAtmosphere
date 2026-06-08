#!/usr/bin/env node
/**
 * verify.mjs — a self-contained, OFFLINE proof of the Atmosphere trust core.
 *
 * A mesh node runs a compute skill ONLY if the skill's hybrid post-quantum seal
 * (ML-DSA-65 + Ed25519) verifies against the pinned origin key. This script
 * proves that seal end-to-end with NO network, NO Hyperswarm, and NO native
 * addons — just the crypto. Run it on any machine in a couple of seconds:
 *
 *   npm install @noble/post-quantum   # the only dependency the proof needs
 *   node verify.mjs
 *
 * It checks that a correctly-sealed payload verifies, and that EVERY tamper —
 * altered payload, wrong origin key, forged classical half, forged PQ half — is
 * refused (fail-closed). Exit code is non-zero if any check is wrong.
 */
import { generateHybridKeyPair, signPayload, verifyPayload } from "./quantum-crypto.js";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { console.log(`  ✓ ${name}`); passed += 1; }
  else { console.log(`  ✗ ${name}`); failed += 1; }
}

// The "origin" that seals skills, plus an unrelated "attacker" identity.
const origin = generateHybridKeyPair();
const attacker = generateHybridKeyPair();

const skill = Buffer.from("wasm-skill: compute(x) = x*x — sealed by the origin");
const sig = signPayload(skill, origin.privateKey);

console.log("Atmosphere trust core — offline seal proof (ML-DSA-65 + Ed25519)\n");

// The one case that MUST pass:
check("a correctly-sealed payload verifies against the origin public key",
  verifyPayload(skill, sig, origin.publicKey) === true);

// Everything below MUST be refused (the warnings you see are the seal rejecting tamper):
const flipFirstByte = (b) => { const c = Buffer.from(b); c[0] ^= 0xff; return c; };
check("a tampered payload is refused",
  verifyPayload(Buffer.concat([skill, Buffer.from("!")]), sig, origin.publicKey) !== true);
check("the wrong (attacker) origin key is refused",
  verifyPayload(skill, sig, attacker.publicKey) !== true);
check("a forged Ed25519 half is refused (both halves required)",
  verifyPayload(skill, { ...sig, ed25519Sig: flipFirstByte(sig.ed25519Sig) }, origin.publicKey) !== true);
check("a forged ML-DSA-65 half is refused (both halves required)",
  verifyPayload(skill, { ...sig, mldsaSig: flipFirstByte(sig.mldsaSig) }, origin.publicKey) !== true);

console.log(`\n${passed}/${passed + failed} checks passed — the seal verifies and every tamper is refused.`);
process.exit(failed ? 1 : 0);
