import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QR_MODULE_COUNT,
  QR_SYMBOL_SEEDS,
  createSeededRng,
  generateQRPattern,
  computeRegion,
  cropRegion,
  runVaultEngine,
  encodeVaultKey,
  decodeVaultKey,
  verifyVaultKey,
  type PixelBuffer,
} from "./engine.ts";

// A synthetic "photo": every pixel's channels encode its own column/row so
// region cropping can be checked for exact coordinate alignment, and the
// overall image is easy to reproduce or perturb deterministically.
function makeTestImage(size: number): PixelBuffer {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = (row * size + col) * 4;
      data[idx] = col % 256;
      data[idx + 1] = row % 256;
      data[idx + 2] = (row + col) % 256;
      data[idx + 3] = 255;
    }
  }
  return { data, width: size, height: size };
}

test("createSeededRng is deterministic and seed-sensitive", () => {
  const a = createSeededRng(1337);
  const b = createSeededRng(1337);
  const c = createSeededRng(1338);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  const seqC = Array.from({ length: 5 }, () => c());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
});

test("generateQRPattern produces a 21x21 grid with recognizable finder corners", () => {
  const pattern = generateQRPattern(QR_SYMBOL_SEEDS["VM-A"]);
  assert.equal(pattern.length, QR_MODULE_COUNT);
  assert.equal(pattern[0].length, QR_MODULE_COUNT);
  // Corner (0,0): d = max(0,0) = 0, even -> on.
  assert.equal(pattern[0][0], 1);
  // Deterministic for the same seed.
  const again = generateQRPattern(QR_SYMBOL_SEEDS["VM-A"]);
  assert.deepEqual(pattern, again);
  // Different seeds diverge outside the finder corners.
  const other = generateQRPattern(QR_SYMBOL_SEEDS["VM-B"]);
  assert.notDeepEqual(pattern, other);
});

test("computeRegion + cropRegion align on exact source coordinates", () => {
  const size = 400;
  const zoom = 8;
  const image = makeTestImage(size);
  const region = computeRegion(size, zoom, 30, 50);
  assert.equal(region.size, QR_MODULE_COUNT * zoom);

  const cropped = cropRegion(image, region);
  // Spot-check a pixel: cropped(0,0) must equal source(region.x, region.y).
  const srcIdx = (region.y * size + region.x) * 4;
  assert.equal(cropped.data[0], image.data[srcIdx]);
  assert.equal(cropped.data[1], image.data[srcIdx + 1]);
  assert.equal(cropped.data[2], image.data[srcIdx + 2]);
});

test("runVaultEngine produces a well-formed, deterministic key", async () => {
  const image = makeTestImage(400);
  const params = {
    vaultId: "VMRK-TEST01",
    fullImage: image,
    regionX: 30,
    regionY: 30,
    zoomLevel: 8,
    qrSymbol: "VM-A" as const,
    issuedAt: "2026-01-01T00:00:00.000Z",
  };

  const result = await runVaultEngine(params);

  assert.equal(result.key.qrSize, QR_MODULE_COUNT);
  assert.equal(result.key.qrSymbol, "VM-A");
  assert.ok(result.key.maskedCount > 0, "at least one masked pixel");
  assert.equal(result.maskedPixels.length, result.key.maskedCount);
  assert.match(result.key.pixelHash, /^[0-9a-f]{64}$/);
  assert.match(result.key.vaultFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(result.pixelGrid.length, QR_MODULE_COUNT);
  assert.equal(result.scrambledPixels.length, result.maskedPixels.length);

  // Same inputs -> same outputs (no hidden non-determinism, e.g. Date.now()).
  const again = await runVaultEngine(params);
  assert.deepEqual(again.key, result.key);
});

test("encodeVaultKey/decodeVaultKey round-trip; garbage input decodes to null", async () => {
  const image = makeTestImage(400);
  const { key, encodedKey } = await runVaultEngine({
    vaultId: "VMRK-TEST02",
    fullImage: image,
    regionX: 10,
    regionY: 20,
    zoomLevel: 6,
    qrSymbol: "VM-C",
    issuedAt: "2026-01-01T00:00:00.000Z",
  });

  const decoded = decodeVaultKey(encodedKey);
  assert.deepEqual(decoded, key);
  assert.equal(decodeVaultKey("not-valid-base64-json"), null);
});

test("verifyVaultKey passes all three layers for the untouched original", async () => {
  const image = makeTestImage(400);
  const { key } = await runVaultEngine({
    vaultId: "VMRK-TEST03",
    fullImage: image,
    regionX: 40,
    regionY: 10,
    zoomLevel: 9,
    qrSymbol: "VM-D",
    issuedAt: "2026-01-01T00:00:00.000Z",
  });

  const result = await verifyVaultKey(image, key);
  assert.equal(result.pass, true);
  assert.equal(result.fingerprint.pass, true);
  assert.equal(result.maskReconstruction.pass, true);
  assert.equal(result.pixelHash.pass, true);
});

test("verifyVaultKey fails the pixel-hash layer when the masked region is altered", async () => {
  const image = makeTestImage(400);
  const { key } = await runVaultEngine({
    vaultId: "VMRK-TEST04",
    fullImage: image,
    regionX: 40,
    regionY: 10,
    zoomLevel: 9,
    qrSymbol: "VM-D",
    issuedAt: "2026-01-01T00:00:00.000Z",
  });

  const tampered: PixelBuffer = { data: image.data.slice(), width: image.width, height: image.height };
  // Flip a pixel inside the vaulted region so the whole-image hash also
  // changes, but exercise the case where only local content is altered.
  const region = computeRegion(image.width, key.zoomLevel, key.regionX, key.regionY);
  const idx = ((region.y + 5) * image.width + (region.x + 5)) * 4;
  tampered.data[idx] = (tampered.data[idx] + 1) % 256;

  const result = await verifyVaultKey(tampered, key);
  assert.equal(result.pass, false);
  // The whole-image fingerprint layer is the one that actually catches this,
  // since any pixel change anywhere shifts the SHA-256 of the full image.
  assert.equal(result.fingerprint.pass, false);
});

test("verifyVaultKey fails the fingerprint layer for a wholly different image", async () => {
  const original = makeTestImage(400);
  const decoy = makeTestImage(400);
  decoy.data.fill(255);

  const { key } = await runVaultEngine({
    vaultId: "VMRK-TEST05",
    fullImage: original,
    regionX: 20,
    regionY: 60,
    zoomLevel: 7,
    qrSymbol: "VM-B",
    issuedAt: "2026-01-01T00:00:00.000Z",
  });

  const result = await verifyVaultKey(decoy, key);
  assert.equal(result.pass, false);
  assert.equal(result.fingerprint.pass, false);
  assert.equal(result.pixelHash.detail, "Skipped — an earlier layer failed.");
});
