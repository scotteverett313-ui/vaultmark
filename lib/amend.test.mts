import { test } from "node:test";
import assert from "node:assert/strict";
import { AMENDABLE_FIELDS, amendPiece, amendmentHistory, amendmentsForField, isAmended } from "./amend.ts";
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
    gallery: "Meridian Gallery",
    signatory: "M. Chen, Director",
    qrSymbol: "VM-A",
    maskedPixelCount: 241,
    imageFingerprint: "a".repeat(64),
    pixelHash: "b".repeat(64),
    captureSource: "upload",
    vaultedAt: "2026-01-01T00:00:00.000Z",
    key: "encoded-key",
    amendments: [],
    thumbnailUrl: "data:image/jpeg;base64,x",
    ...overrides,
  };
}

const AT = "2026-02-02T00:00:00.000Z";

function amend(piece: VaultPiece, over: Partial<Parameters<typeof amendPiece>[1]> = {}) {
  return amendPiece(piece, { field: "title", to: "Untitled No. 8", reason: "Misspelled at intake.", at: AT, ...over });
}

test("an amendment rewrites the field and records what it replaced", () => {
  const result = amend(makePiece());
  assert.ok(result.ok);
  assert.equal(result.piece.title, "Untitled No. 8");
  assert.deepEqual(result.piece.amendments, [
    { at: AT, field: "title", from: "Untitled No. 7", to: "Untitled No. 8", reason: "Misspelled at intake." },
  ]);
});

// The point of the whole feature: a corrected description must still verify
// against exactly the image the key was issued for.
test("nothing the key was computed over can change", () => {
  const before = makePiece();
  const result = amend(before);
  assert.ok(result.ok);

  const sealed = ["id", "qrSymbol", "maskedPixelCount", "imageFingerprint", "pixelHash", "captureSource", "vaultedAt", "key", "certificateNumber"] as const;
  for (const field of sealed) {
    assert.equal(result.piece[field], before[field], `${field} must survive an amendment untouched`);
  }
});

test("the original piece is left alone", () => {
  const before = makePiece();
  amend(before);
  assert.equal(before.title, "Untitled No. 7");
  assert.deepEqual(before.amendments, []);
});

test("amendments stack, newest last, across different fields", () => {
  const first = amend(makePiece());
  assert.ok(first.ok);
  const second = amend(first.piece, { field: "value", to: "$22,000 USD", reason: "Reappraised 2026." });
  assert.ok(second.ok);

  assert.equal(second.piece.amendments.length, 2);
  assert.equal(second.piece.amendments[1].field, "value");
  assert.equal(second.piece.value, "$22,000 USD");
  assert.equal(amendmentsForField(second.piece, "title").length, 1);
  assert.ok(isAmended(second.piece, "title"));
  assert.ok(!isAmended(second.piece, "medium"));
});

test("a second correction to the same field keeps the first in the history", () => {
  const first = amend(makePiece());
  assert.ok(first.ok);
  const second = amend(first.piece, { to: "Untitled No. 9", reason: "Artist renamed the work." });
  assert.ok(second.ok);

  assert.deepEqual(
    second.piece.amendments.map((a) => [a.from, a.to]),
    [
      ["Untitled No. 7", "Untitled No. 8"],
      ["Untitled No. 8", "Untitled No. 9"],
    ],
  );
});

test("a blank value, an unchanged value, or a thin reason is refused", () => {
  const piece = makePiece();
  assert.equal(amend(piece, { to: "   " }).ok, false);
  assert.equal(amend(piece, { to: "Untitled No. 7" }).ok, false);
  assert.equal(amend(piece, { reason: "x" }).ok, false);
  assert.equal(amend(piece, { reason: "   " }).ok, false);
});

test("values and reasons are trimmed before they are stored", () => {
  const result = amend(makePiece(), { to: "  Untitled No. 8  ", reason: "  Misspelled at intake.  " });
  assert.ok(result.ok);
  assert.equal(result.piece.title, "Untitled No. 8");
  assert.equal(result.amendment.reason, "Misspelled at intake.");
});

test("a sealed field is refused even if a caller asks for it by name", () => {
  // @ts-expect-error — the type forbids this; the guard exists for data that
  // reaches the function from storage or a future caller.
  const result = amendPiece(makePiece(), { field: "pixelHash", to: "c".repeat(64), reason: "Trying it on." });
  assert.equal(result.ok, false);
});

test("every amendable field is a real string field on a piece", () => {
  const piece = makePiece();
  for (const { field } of AMENDABLE_FIELDS) {
    assert.equal(typeof piece[field], "string", `${field} must exist on VaultPiece`);
  }
});

test("a record written before amendments existed reads as an empty history", () => {
  const legacy = makePiece();
  delete (legacy as Partial<VaultPiece>).amendments;
  assert.deepEqual(amendmentHistory(legacy), []);
  assert.ok(amend(legacy).ok);
});
