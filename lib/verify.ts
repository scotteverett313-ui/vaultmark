import { decodeVaultKey } from "./engine.ts";
import type { VaultPiece } from "./types";

export interface KeyMatchCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export interface KeyMatchResult {
  pass: boolean;
  checks: KeyMatchCheck[];
}

// Checks a pasted credential against a stored record. This answers "does this
// key belong to this piece", which is what the library modal is for. It cannot
// tell whether an image has been altered — that needs the pixels, and lives in
// the engine's verifyVaultKey behind the public verify page.
export function verifyKeyAgainstPiece(encodedKey: string, piece: VaultPiece): KeyMatchResult {
  const key = decodeVaultKey(encodedKey);

  if (!key) {
    return {
      pass: false,
      checks: [{ label: "Key format", pass: false, detail: "Could not decode — the credential is corrupt or not a Vaultmark key." }],
    };
  }

  const checks: KeyMatchCheck[] = [
    {
      label: "Key format",
      pass: true,
      detail: `Decoded a version ${key.version} credential issued ${key.issuedAt}.`,
    },
    {
      label: "Vault ID",
      pass: key.vaultId === piece.id,
      detail: key.vaultId === piece.id ? `Matches ${piece.id}.` : `Key names ${key.vaultId}, this record is ${piece.id}.`,
    },
    {
      label: "Image fingerprint",
      pass: key.vaultFingerprint === piece.imageFingerprint,
      detail:
        key.vaultFingerprint === piece.imageFingerprint
          ? "Whole-image fingerprint matches the record."
          : "Fingerprint differs — this key was issued for a different image.",
    },
    {
      label: "Pixel hash",
      pass: key.pixelHash === piece.pixelHash,
      detail:
        key.pixelHash === piece.pixelHash
          ? `${key.maskedCount} masked pixels match the record.`
          : "Masked-pixel hash differs from the record.",
    },
    {
      label: "QR symbol",
      pass: key.qrSymbol === piece.qrSymbol,
      detail: key.qrSymbol === piece.qrSymbol ? `Symbol ${key.qrSymbol}.` : `Key uses ${key.qrSymbol}, record uses ${piece.qrSymbol}.`,
    },
  ];

  return { pass: checks.every((c) => c.pass), checks };
}
