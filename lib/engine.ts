import type { QRSymbolId, VaultKeyCredential } from "./types";

export const QR_MODULE_COUNT = 21;

export const QR_SYMBOL_SEEDS: Record<QRSymbolId, number> = {
  "VM-A": 1337,
  "VM-B": 2674,
  "VM-C": 5318,
  "VM-D": 7991,
};

// Structural subset of DOM's ImageData — lets this module run against real
// canvas pixels in the browser or a plain object in a Node test, with no
// dependency on the DOM lib.
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface MaskedPixel {
  row: number;
  col: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface VaultRegion {
  x: number;
  y: number;
  size: number;
}

export interface VerifyLayerResult {
  pass: boolean;
  detail: string;
}

export interface VerifyResult {
  pass: boolean;
  fingerprint: VerifyLayerResult;
  maskReconstruction: VerifyLayerResult;
  pixelHash: VerifyLayerResult;
}

// Mulberry32 xorshift — the same seeded PRNG used across every HTML prototype,
// so a given seed always reproduces the same QR pattern and scramble order.
export function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function sha256Hex(bytes: Uint8Array | Uint8ClampedArray): Promise<string> {
  // Copy into a plain ArrayBuffer-backed view first: typed arrays sliced from a
  // canvas ImageData can carry a wider ArrayBufferLike type that SubtleCrypto rejects.
  const view = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", view);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generates the 21x21 module pattern for a QR symbol: deterministic finder
// squares in three corners (so it reads as a real QR code), seeded noise
// everywhere else.
export function generateQRPattern(seed: number): number[][] {
  const rng = createSeededRng(seed);
  const size = QR_MODULE_COUNT;
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const topLeft = r < 8 && c < 8;
      const topRight = r < 8 && c >= size - 8;
      const bottomLeft = r >= size - 8 && c < 8;
      if (topLeft || topRight || bottomLeft) {
        const d = topLeft ? Math.max(r, c) : topRight ? Math.max(r, size - 1 - c) : Math.max(size - 1 - r, c);
        return d % 2 === 0 ? 1 : 0;
      }
      return rng() > 0.45 ? 1 : 0;
    }),
  );
}

export function computeRegion(
  imageSize: number,
  zoomLevel: number,
  regionXPercent: number,
  regionYPercent: number,
): VaultRegion {
  const size = QR_MODULE_COUNT * zoomLevel;
  const x = Math.floor((regionXPercent / 100) * (imageSize - size));
  const y = Math.floor((regionYPercent / 100) * (imageSize - size));
  return { x, y, size };
}

export function cropRegion(image: PixelBuffer, region: VaultRegion): PixelBuffer {
  const data = new Uint8ClampedArray(region.size * region.size * 4);
  for (let row = 0; row < region.size; row++) {
    for (let col = 0; col < region.size; col++) {
      const srcIdx = ((region.y + row) * image.width + (region.x + col)) * 4;
      const dstIdx = (row * region.size + col) * 4;
      data[dstIdx] = image.data[srcIdx];
      data[dstIdx + 1] = image.data[srcIdx + 1];
      data[dstIdx + 2] = image.data[srcIdx + 2];
      data[dstIdx + 3] = image.data[srcIdx + 3];
    }
  }
  return { data, width: region.size, height: region.size };
}

// Samples the center pixel of each zoomLevel x zoomLevel cell within a region,
// producing the 21x21 "pixel grid" the Vault screen's pipeline visualizes.
export function samplePixelGrid(region: PixelBuffer, zoomLevel: number): MaskedPixel[][] {
  const size = QR_MODULE_COUNT;
  const grid: MaskedPixel[][] = [];
  for (let row = 0; row < size; row++) {
    const cols: MaskedPixel[] = [];
    for (let col = 0; col < size; col++) {
      const sx = col * zoomLevel + Math.floor(zoomLevel / 2);
      const sy = row * zoomLevel + Math.floor(zoomLevel / 2);
      const idx = (sy * region.width + sx) * 4;
      cols.push({ row, col, r: region.data[idx], g: region.data[idx + 1], b: region.data[idx + 2], a: region.data[idx + 3] });
    }
    grid.push(cols);
  }
  return grid;
}

// Reads only the cells where the QR pattern is "on" — the pixels the key
// credential actually authenticates.
export function extractMaskedPixels(region: PixelBuffer, zoomLevel: number, pattern: number[][]): MaskedPixel[] {
  const masked: MaskedPixel[] = [];
  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (!pattern[row][col]) continue;
      const sx = col * zoomLevel + Math.floor(zoomLevel / 2);
      const sy = row * zoomLevel + Math.floor(zoomLevel / 2);
      const idx = (sy * region.width + sx) * 4;
      masked.push({ row, col, r: region.data[idx], g: region.data[idx + 1], b: region.data[idx + 2], a: region.data[idx + 3] });
    }
  }
  return masked;
}

export async function hashMaskedPixels(pixels: MaskedPixel[]): Promise<string> {
  const bytes = new Uint8Array(pixels.length * 4);
  pixels.forEach((p, i) => {
    bytes[i * 4] = p.r;
    bytes[i * 4 + 1] = p.g;
    bytes[i * 4 + 2] = p.b;
    bytes[i * 4 + 3] = p.a;
  });
  return sha256Hex(bytes);
}

// Scrambles which color sits at which masked position — the "safe to
// display" frame. It only reorders the extracted key pixels among
// themselves; the rest of the image is untouched.
export function scrambleMaskedPixels(pixels: MaskedPixel[], pixelHash: string): MaskedPixel[] {
  const seed = parseInt(pixelHash.slice(0, 8), 16);
  const rng = createSeededRng(seed);
  const order = shuffle(
    pixels.map((_, i) => i),
    rng,
  );
  return order.map((srcIndex, destIndex) => ({
    ...pixels[srcIndex],
    row: pixels[destIndex].row,
    col: pixels[destIndex].col,
  }));
}

export interface RunVaultEngineParams {
  vaultId: string;
  fullImage: PixelBuffer;
  regionX: number;
  regionY: number;
  zoomLevel: number;
  qrSymbol: QRSymbolId;
  issuedAt: string;
}

export interface RunVaultEngineResult {
  key: VaultKeyCredential;
  encodedKey: string;
  pattern: number[][];
  pixelGrid: MaskedPixel[][];
  maskedPixels: MaskedPixel[];
  scrambledPixels: MaskedPixel[];
  vaultFingerprint: string;
}

export async function runVaultEngine(params: RunVaultEngineParams): Promise<RunVaultEngineResult> {
  const { vaultId, fullImage, regionX, regionY, zoomLevel, qrSymbol, issuedAt } = params;

  const vaultFingerprint = await sha256Hex(fullImage.data);
  const region = computeRegion(fullImage.width, zoomLevel, regionX, regionY);
  const regionBuffer = cropRegion(fullImage, region);
  const pattern = generateQRPattern(QR_SYMBOL_SEEDS[qrSymbol]);
  const pixelGrid = samplePixelGrid(regionBuffer, zoomLevel);
  const maskedPixels = extractMaskedPixels(regionBuffer, zoomLevel, pattern);
  const pixelHash = await hashMaskedPixels(maskedPixels);
  const scrambledPixels = scrambleMaskedPixels(maskedPixels, pixelHash);

  const key: VaultKeyCredential = {
    version: "1.0",
    vaultId,
    qrSymbol,
    regionX,
    regionY,
    zoomLevel,
    qrSize: QR_MODULE_COUNT,
    maskedCount: maskedPixels.length,
    pixelHash,
    vaultFingerprint,
    issuedAt,
  };

  return {
    key,
    encodedKey: encodeVaultKey(key),
    pattern,
    pixelGrid,
    maskedPixels,
    scrambledPixels,
    vaultFingerprint,
  };
}

export function encodeVaultKey(key: VaultKeyCredential): string {
  return btoa(JSON.stringify(key));
}

export function decodeVaultKey(raw: string): VaultKeyCredential | null {
  try {
    return JSON.parse(atob(raw.trim())) as VaultKeyCredential;
  } catch {
    return null;
  }
}

// Three-layer authenticity check against a freshly supplied candidate image:
// (1) the whole-image fingerprint, (2) the QR mask reconstructed from the
// key's own symbol id, (3) the masked-pixel hash recomputed at the key's
// stored region and zoom. All three must pass for the candidate to be
// considered the authenticated original — this is what the stateless
// Public Verify page runs against an uploaded image plus a pasted key.
export async function verifyVaultKey(candidateImage: PixelBuffer, key: VaultKeyCredential): Promise<VerifyResult> {
  const candidateFingerprint = await sha256Hex(candidateImage.data);
  const fingerprintPass = candidateFingerprint === key.vaultFingerprint;
  const fingerprint: VerifyLayerResult = {
    pass: fingerprintPass,
    detail: fingerprintPass
      ? "Whole-image fingerprint matches the vaulted original."
      : `Fingerprint mismatch — expected ${key.vaultFingerprint.slice(0, 16)}…, got ${candidateFingerprint.slice(0, 16)}….`,
  };

  const pattern = generateQRPattern(QR_SYMBOL_SEEDS[key.qrSymbol]);
  const maskPass = pattern.length === key.qrSize && pattern.some((row) => row.includes(1));
  const maskReconstruction: VerifyLayerResult = {
    pass: maskPass,
    detail: maskPass
      ? `QR mask for ${key.qrSymbol} reconstructed from its seed.`
      : `Could not reconstruct a valid mask for symbol ${key.qrSymbol}.`,
  };

  if (!fingerprintPass || !maskPass) {
    return {
      pass: false,
      fingerprint,
      maskReconstruction,
      pixelHash: { pass: false, detail: "Skipped — an earlier layer failed." },
    };
  }

  const region = computeRegion(candidateImage.width, key.zoomLevel, key.regionX, key.regionY);
  const regionBuffer = cropRegion(candidateImage, region);
  const maskedPixels = extractMaskedPixels(regionBuffer, key.zoomLevel, pattern);
  const candidatePixelHash = await hashMaskedPixels(maskedPixels);
  const pixelHashPass = candidatePixelHash === key.pixelHash && maskedPixels.length === key.maskedCount;

  return {
    pass: fingerprintPass && maskPass && pixelHashPass,
    fingerprint,
    maskReconstruction,
    pixelHash: {
      pass: pixelHashPass,
      detail: pixelHashPass
        ? `${maskedPixels.length} masked pixels match the issued key.`
        : "Masked-pixel hash does not match — the region may have been altered.",
    },
  };
}
