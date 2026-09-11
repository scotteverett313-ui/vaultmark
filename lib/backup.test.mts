import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBackup } from "./backup.ts";
import { buildCollectionCsv, buildCollectionJson } from "./records.ts";
import type { VaultPiece } from "./types.ts";

function makePiece(overrides: Partial<VaultPiece> = {}): VaultPiece {
  return {
    id: "VMRK-TEST01",
    certificateNumber: "VMRK-CERT-0001",
    title: "Untitled No. 7",
    artist: "Dominique Okafor",
    year: "2023",
    medium: "Oil on linen",
    dimensions: "48 × 36 in",
    edition: "1 of 1",
    status: "Vaulted",
    value: "$18,500 USD",
    appraiser: "R. Halvorsen, AAA",
    provenance: "Acquired directly from artist.",
    notes: "Excellent condition.",
    qrSymbol: "VM-A",
    maskedPixelCount: 241,
    imageFingerprint: "a".repeat(64),
    pixelHash: "b".repeat(64),
    captureSource: "upload",
    vaultedAt: "2026-01-01T00:00:00.000Z",
    key: "encoded-key",
    gallery: "Meridian Gallery",
    signatory: "M. Chen, Director",
    thumbnailUrl: "data:image/jpeg;base64,x",
    amendments: [],
    ...overrides,
  };
}

// The pairing that matters: whatever the library writes, the import reads.
test("a file written by the Backup export reads back in full", () => {
  const pieces = [makePiece({ id: "A" }), makePiece({ id: "B", certificateNumber: "VMRK-CERT-0002" })];
  const outcome = parseBackup(buildCollectionJson(pieces, "gallery", "2026-01-01T00:00:00.000Z"));

  assert.ok(outcome.ok);
  assert.deepEqual(outcome.backup.pieces, pieces);
  assert.equal(outcome.backup.sessionType, "gallery");
  assert.equal(outcome.backup.rejected, 0);
  assert.equal(typeof outcome.backup.exportedAt, "string");
});

test("keys survive the round-trip — a restored record can still be verified", () => {
  const piece = makePiece({ key: "VMK1.eyJ2YXVsdElkIjoiVk1SSy1URVNUMDEifQ" });
  const outcome = parseBackup(buildCollectionJson([piece], "private", null));
  assert.ok(outcome.ok);
  assert.equal(outcome.backup.pieces[0].key, piece.key);
  assert.equal(outcome.backup.pieces[0].pixelHash, piece.pixelHash);
  assert.equal(outcome.backup.pieces[0].imageFingerprint, piece.imageFingerprint);
});

test("amendment history survives the round-trip", () => {
  const piece = makePiece({
    title: "Untitled No. 8",
    amendments: [{ at: "2026-02-02T00:00:00.000Z", field: "title", from: "Untitled No. 7", to: "Untitled No. 8", reason: "Typo." }],
  });
  const outcome = parseBackup(buildCollectionJson([piece], "private", null));
  assert.ok(outcome.ok);
  assert.deepEqual(outcome.backup.pieces[0].amendments, piece.amendments);
});

test("a corrupt record is dropped and counted, not fatal to the file", () => {
  const raw = JSON.stringify({ pieces: [makePiece(), { id: "junk" }, 7] });
  const outcome = parseBackup(raw);
  assert.ok(outcome.ok);
  assert.equal(outcome.backup.pieces.length, 1);
  assert.equal(outcome.backup.rejected, 2);
});

test("the wrong file is refused with a reason a person can act on", () => {
  const refusals = [
    parseBackup("not json at all"),
    parseBackup("[]"),
    parseBackup(JSON.stringify({ exportedAt: "2026-01-01" })),
    parseBackup(JSON.stringify({ pieces: [{ id: "junk" }] })),
    parseBackup(buildCollectionCsv([makePiece()])),
  ];

  for (const outcome of refusals) {
    assert.ok(!outcome.ok);
    assert.ok(outcome.error.length > 0);
  }
  // The CSV is the inventory file, and it carries no keys — worth saying so.
  const csv = parseBackup(buildCollectionCsv([makePiece()]));
  assert.ok(!csv.ok && /not readable JSON|not a Vaultmark backup|CSV/.test(csv.error));
});
