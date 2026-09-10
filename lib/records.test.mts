import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVaultPiece, certificateNumber, formatDimensions, formatEdition } from "./records.ts";
import type { LabelDraft } from "../components/IntakeContext.tsx";

function draft(overrides: Partial<LabelDraft> = {}): LabelDraft {
  return {
    title: "Threshold (Diptych, Left)",
    artist: "Yuki Tanaka",
    year: "2024",
    medium: "Acrylic and graphite on canvas",
    height: "60",
    width: "40",
    depth: "",
    weight: "",
    unit: "in",
    editionType: "1of1",
    editionNumber: "",
    provenance: "Commissioned by Meridian Gallery, 2024.",
    gallery: "Meridian Gallery",
    signatory: "M. Chen, Director",
    value: "$24,000 USD",
    appraiser: "R. Halvorsen, AAA",
    notes: "",
    ...overrides,
  };
}

const vault = {
  encodedKey: "ZW5jb2RlZA==",
  key: {
    version: "1.0",
    vaultId: "VMRK-TEST01",
    qrSymbol: "VM-B" as const,
    regionX: 30,
    regionY: 30,
    zoomLevel: 8,
    qrSize: 21,
    maskedCount: 213,
    pixelHash: "b".repeat(64),
    vaultFingerprint: "a".repeat(64),
    issuedAt: "2026-01-01T00:00:00.000Z",
  },
};

const captured = {
  pixels: null as unknown as ImageData,
  size: 640,
  fingerprint: "a".repeat(64),
  fileName: "threshold.png",
  format: "PNG",
  source: "upload" as const,
  previewUrl: "data:image/png;base64,x",
  sourceWidth: 900,
  sourceHeight: 640,
};

test("certificate numbers are session-sequential and zero-padded", () => {
  assert.equal(certificateNumber(0), "VMRK-CERT-0001");
  assert.equal(certificateNumber(7), "VMRK-CERT-0008");
  assert.equal(certificateNumber(999), "VMRK-CERT-1000");
});

test("dimensions join only the provided axes and carry the unit", () => {
  assert.equal(formatDimensions(draft()), "60 × 40 in");
  assert.equal(formatDimensions(draft({ depth: "2", unit: "cm" })), "60 × 40 × 2 cm");
  assert.equal(formatDimensions(draft({ height: "", width: "", depth: "" })), "—");
});

test("edition prefers a stated number only for limited editions", () => {
  assert.equal(formatEdition(draft()), "1 of 1 (Unique)");
  assert.equal(formatEdition(draft({ editionType: "ap" })), "Artist Proof");
  assert.equal(formatEdition(draft({ editionType: "limited", editionNumber: "2 of 5" })), "2 of 5");
  // Limited but unnumbered falls back to the type rather than showing blank.
  assert.equal(formatEdition(draft({ editionType: "limited" })), "Limited Edition");
});

test("buildVaultPiece fixes the record from the drafts and engine output", () => {
  const piece = buildVaultPiece({ label: draft(), vault, captured, pieceCount: 2, thumbnailUrl: "data:image/jpeg;base64,y" });

  assert.equal(piece.id, "VMRK-TEST01");
  assert.equal(piece.certificateNumber, "VMRK-CERT-0003");
  assert.equal(piece.status, "Vaulted");
  assert.equal(piece.dimensions, "60 × 40 in");
  assert.equal(piece.edition, "1 of 1 (Unique)");
  assert.equal(piece.qrSymbol, "VM-B");
  assert.equal(piece.maskedPixelCount, 213);
  assert.equal(piece.pixelHash, vault.key.pixelHash);
  assert.equal(piece.imageFingerprint, captured.fingerprint);
  assert.equal(piece.key, vault.encodedKey);
  assert.equal(piece.captureSource, "upload");
  assert.equal(piece.thumbnailUrl, "data:image/jpeg;base64,y");
});

test("buildVaultPiece renders blank optional fields as an em dash, never empty", () => {
  const piece = buildVaultPiece({
    label: draft({ year: "", medium: "  ", notes: "", gallery: "", value: "" }),
    vault,
    captured,
    pieceCount: 0,
    thumbnailUrl: "",
  });

  assert.equal(piece.year, "—");
  assert.equal(piece.medium, "—");
  assert.equal(piece.notes, "—");
  assert.equal(piece.gallery, "—");
  assert.equal(piece.value, "—");
  // Required fields still carry their real values.
  assert.equal(piece.title, "Threshold (Diptych, Left)");
});

test("a camera capture keeps its lossy-master flag on the record", () => {
  const piece = buildVaultPiece({
    label: draft(),
    vault,
    captured: { ...captured, source: "camera" },
    pieceCount: 0,
    thumbnailUrl: "",
  });
  assert.equal(piece.captureSource, "camera");
});
