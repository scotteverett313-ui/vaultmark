import type { AmendableField, Amendment, VaultPiece } from "./types";
import { AMENDABLE_FIELDS } from "./amend.ts";

// Every string field buildVaultPiece always writes. Anything missing one of
// these did not come out of this app, and would render as a broken card.
const REQUIRED_STRINGS = [
  "id",
  "certificateNumber",
  "title",
  "artist",
  "year",
  "medium",
  "dimensions",
  "edition",
  "value",
  "appraiser",
  "provenance",
  "notes",
  "gallery",
  "signatory",
  "imageFingerprint",
  "pixelHash",
  "vaultedAt",
  "key",
] as const;

const STATUSES = ["Vaulted", "Listed", "Sold", "On Loan"];
const SYMBOLS = ["VM-A", "VM-B", "VM-C", "VM-D"];

// Storage and imported backups are both trust boundaries: a blob can be stale
// from an older build, hand-edited, or simply the wrong file.
export function isVaultPiece(value: unknown): value is VaultPiece {
  if (typeof value !== "object" || value === null) return false;
  const piece = value as Record<string, unknown>;

  if (!REQUIRED_STRINGS.every((field) => typeof piece[field] === "string" && piece[field] !== "")) return false;
  if (typeof piece.maskedPixelCount !== "number") return false;
  if (!STATUSES.includes(piece.status as string)) return false;
  if (!SYMBOLS.includes(piece.qrSymbol as string)) return false;
  if (piece.captureSource !== "upload" && piece.captureSource !== "camera") return false;
  return true;
}

// Records sealed by an earlier build predate amendment history and may have no
// thumbnail. Fill those in rather than discarding otherwise valid records.
export function normalizePiece(piece: VaultPiece): VaultPiece {
  return {
    ...piece,
    thumbnailUrl: typeof piece.thumbnailUrl === "string" ? piece.thumbnailUrl : "",
    amendments: Array.isArray(piece.amendments) ? piece.amendments.filter(isAmendment) : [],
  };
}

export function isAmendment(value: unknown): value is Amendment {
  if (typeof value !== "object" || value === null) return false;
  const { at, field, from, to, reason } = value as Partial<Amendment>;
  return (
    typeof at === "string" &&
    typeof from === "string" &&
    typeof to === "string" &&
    typeof reason === "string" &&
    AMENDABLE_FIELDS.some((f) => f.field === (field as AmendableField))
  );
}

export function readPieces(value: unknown): VaultPiece[] {
  return Array.isArray(value) ? value.filter(isVaultPiece).map(normalizePiece) : [];
}
