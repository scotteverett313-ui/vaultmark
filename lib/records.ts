import type { CapturedImage, LabelDraft, VaultDraft } from "@/components/IntakeContext";
import type { VaultPiece } from "./types";

// Single source for edition wording: the select and the sealed record must
// never disagree about what "ap" is called.
export const EDITION_TYPES = ["1of1", "limited", "ap", "open"] as const;

export const EDITION_LABELS: Record<LabelDraft["editionType"], string> = {
  "1of1": "1 of 1 (Unique)",
  limited: "Limited Edition",
  ap: "Artist Proof",
  open: "Open Edition",
};

export function certificateNumber(pieceCount: number): string {
  return `VMRK-CERT-${String(pieceCount + 1).padStart(4, "0")}`;
}

export function formatDimensions(label: LabelDraft): string {
  const parts = [label.height, label.width, label.depth].map((p) => p.trim()).filter(Boolean);
  return parts.length ? `${parts.join(" × ")} ${label.unit}` : "—";
}

export function formatEdition(label: LabelDraft): string {
  if (label.editionType === "limited" && label.editionNumber.trim()) return label.editionNumber.trim();
  return EDITION_LABELS[label.editionType];
}

// The downloadable certificate. Plain text on purpose: it has to stay
// readable in fifty years without a PDF reader or this app.
export function buildCertificateText(piece: VaultPiece): string {
  const rule = "─".repeat(52);
  const lines = [
    "VAULTMARK — CERTIFICATE OF AUTHENTICITY",
    "═".repeat(52),
    "",
    `Certificate No.   ${piece.certificateNumber}`,
    `Vault ID          ${piece.id}`,
    `Issued            ${piece.vaultedAt}`,
    "",
    "ARTWORK",
    rule,
    `Title             ${piece.title}`,
    `Artist            ${piece.artist}`,
    `Year              ${piece.year}`,
    `Medium            ${piece.medium}`,
    `Dimensions        ${piece.dimensions}`,
    `Edition           ${piece.edition}`,
    "",
    "AUTHENTICATION",
    rule,
    `QR Symbol         ${piece.qrSymbol}`,
    `Masked Pixels     ${piece.maskedPixelCount}`,
    `Image Fingerprint ${piece.imageFingerprint}`,
    `Pixel Hash        ${piece.pixelHash}`,
    `Capture Source    ${piece.captureSource === "camera" ? "Camera — lossy master" : "Upload — lossless"}`,
    "",
    "PROVENANCE",
    rule,
    piece.provenance,
    "",
    `Appraised Value   ${piece.value}`,
    `Appraiser         ${piece.appraiser}`,
  ];

  if (piece.gallery !== "—" || piece.signatory !== "—") {
    lines.push("", "GALLERY", rule, `Gallery           ${piece.gallery}`, `Signatory         ${piece.signatory}`);
  }

  lines.push(
    "",
    rule,
    "VAULTMARK AUTHENTICATION PROTOCOL",
    "This document records pixel-level cryptographic authentication.",
    "The key credential is held by the owner and is not retained by Vaultmark.",
  );

  return lines.join("\n");
}

export interface BuildVaultPieceParams {
  label: LabelDraft;
  vault: VaultDraft;
  captured: CapturedImage;
  pieceCount: number;
  thumbnailUrl: string;
}

// The one place drafts become a permanent record. Everything the dashboard,
// certificate, and detail modal read is fixed here, at seal time.
export function buildVaultPiece({
  label,
  vault,
  captured,
  pieceCount,
  thumbnailUrl,
}: BuildVaultPieceParams): VaultPiece {
  const blank = (value: string) => (value.trim() ? value.trim() : "—");

  return {
    id: vault.key.vaultId,
    certificateNumber: certificateNumber(pieceCount),
    title: blank(label.title),
    artist: blank(label.artist),
    year: blank(label.year),
    medium: blank(label.medium),
    dimensions: formatDimensions(label),
    edition: formatEdition(label),
    status: "Vaulted",
    value: blank(label.value),
    appraiser: blank(label.appraiser),
    provenance: blank(label.provenance),
    notes: blank(label.notes),
    gallery: blank(label.gallery),
    signatory: blank(label.signatory),
    qrSymbol: vault.key.qrSymbol,
    maskedPixelCount: vault.key.maskedCount,
    imageFingerprint: captured.fingerprint,
    pixelHash: vault.key.pixelHash,
    captureSource: captured.source,
    vaultedAt: vault.key.issuedAt,
    key: vault.encodedKey,
    thumbnailUrl,
  };
}
