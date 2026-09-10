import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyKeyAgainstPiece } from "./verify.ts";
import { encodeVaultKey } from "./engine.ts";
import type { VaultKeyCredential, VaultPiece } from "./types.ts";

const key: VaultKeyCredential = {
  version: "1.0",
  vaultId: "VMRK-TEST01",
  qrSymbol: "VM-B",
  regionX: 30,
  regionY: 30,
  zoomLevel: 8,
  qrSize: 21,
  maskedCount: 213,
  pixelHash: "b".repeat(64),
  vaultFingerprint: "a".repeat(64),
  issuedAt: "2026-01-01T00:00:00.000Z",
};

const piece: VaultPiece = {
  id: "VMRK-TEST01",
  certificateNumber: "VMRK-CERT-0001",
  title: "Threshold",
  artist: "Yuki Tanaka",
  year: "2024",
  medium: "Acrylic",
  dimensions: "60 × 40 in",
  edition: "1 of 1 (Unique)",
  status: "Vaulted",
  value: "$24,000 USD",
  appraiser: "—",
  provenance: "—",
  notes: "—",
  gallery: "—",
  signatory: "—",
  qrSymbol: "VM-B",
  maskedPixelCount: 213,
  imageFingerprint: "a".repeat(64),
  pixelHash: "b".repeat(64),
  captureSource: "upload",
  vaultedAt: "2026-01-01T00:00:00.000Z",
  key: encodeVaultKey(key),
  thumbnailUrl: "",
};

const failing = (r: { checks: { label: string; pass: boolean }[] }) =>
  r.checks.filter((c) => !c.pass).map((c) => c.label);

test("the piece's own key matches its record on every check", () => {
  const result = verifyKeyAgainstPiece(piece.key, piece);
  assert.equal(result.pass, true);
  assert.equal(failing(result).length, 0);
  assert.equal(result.checks.length, 5);
});

test("garbage input fails at the format check without throwing", () => {
  for (const bad of ["", "not-a-key", "eyJib2d1cyI6", btoa("{}")]) {
    const result = verifyKeyAgainstPiece(bad, piece);
    assert.equal(result.pass, false, `rejected: ${bad}`);
  }
});

test("a key issued for a different image fails fingerprint and pixel hash", () => {
  const other = encodeVaultKey({ ...key, vaultFingerprint: "c".repeat(64), pixelHash: "d".repeat(64) });
  const result = verifyKeyAgainstPiece(other, piece);
  assert.equal(result.pass, false);
  assert.deepEqual(failing(result), ["Image fingerprint", "Pixel hash"]);
});

test("a key for another vault entry fails on vault ID alone", () => {
  const other = encodeVaultKey({ ...key, vaultId: "VMRK-OTHER" });
  const result = verifyKeyAgainstPiece(other, piece);
  assert.equal(result.pass, false);
  assert.deepEqual(failing(result), ["Vault ID"]);
});

test("a tampered symbol is caught even when the hashes still line up", () => {
  const other = encodeVaultKey({ ...key, qrSymbol: "VM-D" });
  const result = verifyKeyAgainstPiece(other, piece);
  assert.equal(result.pass, false);
  assert.deepEqual(failing(result), ["QR symbol"]);
});
