export type SessionType = "gallery" | "private";

export type PieceStatus = "Vaulted" | "Listed" | "Sold" | "On Loan";

export type QRSymbolId = "VM-A" | "VM-B" | "VM-C" | "VM-D";

// The issued .vmk credential: enough to reconstruct the QR mask and the
// exact region of the original image it was drawn over, so a candidate
// image can be re-checked against it without Vaultmark storing anything.
export interface VaultKeyCredential {
  version: string;
  vaultId: string;
  qrSymbol: QRSymbolId;
  regionX: number;
  regionY: number;
  zoomLevel: number;
  qrSize: number;
  maskedCount: number;
  pixelHash: string;
  vaultFingerprint: string;
  issuedAt: string;
}

// Fields of a sealed record that may be corrected after the fact. The
// authentication facts — vault ID, fingerprint, pixel hash, QR symbol,
// masked count, issue time, key — are deliberately absent: correcting a
// description is bookkeeping, changing what was hashed is forgery.
export type AmendableField =
  | "title"
  | "artist"
  | "year"
  | "medium"
  | "dimensions"
  | "edition"
  | "value"
  | "appraiser"
  | "provenance"
  | "notes"
  | "gallery"
  | "signatory";

// One correction, kept forever. The record shows the current value; the
// history shows every value it has ever held and why it changed.
export interface Amendment {
  at: string;
  field: AmendableField;
  from: string;
  to: string;
  reason: string;
}

export interface VaultPiece {
  id: string;
  certificateNumber: string;
  title: string;
  artist: string;
  year: string;
  medium: string;
  dimensions: string;
  edition: string;
  status: PieceStatus;
  value: string;
  appraiser: string;
  provenance: string;
  notes: string;
  gallery: string;
  signatory: string;
  qrSymbol: QRSymbolId;
  maskedPixelCount: number;
  imageFingerprint: string;
  pixelHash: string;
  // "camera" marks a lossy master photographed at intake rather than an
  // uploaded lossless file — it travels with the record and the certificate.
  captureSource: "upload" | "camera";
  vaultedAt: string;
  key: string;
  // Append-only corrections made after sealing. Never empty-checked away:
  // an absent history and an empty one mean the same thing, but the array
  // keeps the record's shape stable across builds.
  amendments: Amendment[];
  // A small JPEG of the vaulted square. Kept tiny on purpose: pieces persist
  // to localStorage, so full-size previews would blow the quota.
  thumbnailUrl: string;
}
