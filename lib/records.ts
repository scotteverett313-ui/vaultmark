import type { CapturedImage, LabelDraft, VaultDraft } from "@/components/IntakeContext";
import type { VaultPiece } from "./types";
import { amendmentHistory, fieldLabel, formatAmendmentDate } from "./amend.ts";

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

const CSV_COLUMNS: [string, (p: VaultPiece) => string][] = [
  ["Certificate", (p) => p.certificateNumber],
  ["Vault ID", (p) => p.id],
  ["Title", (p) => p.title],
  ["Artist", (p) => p.artist],
  ["Year", (p) => p.year],
  ["Medium", (p) => p.medium],
  ["Dimensions", (p) => p.dimensions],
  ["Edition", (p) => p.edition],
  ["Status", (p) => p.status],
  ["Appraised Value", (p) => p.value],
  ["Appraiser", (p) => p.appraiser],
  ["Provenance", (p) => p.provenance],
  ["Notes", (p) => p.notes],
  ["Gallery", (p) => p.gallery],
  ["Signatory", (p) => p.signatory],
  ["QR Symbol", (p) => p.qrSymbol],
  ["Masked Pixels", (p) => String(p.maskedPixelCount)],
  ["Image Fingerprint", (p) => p.imageFingerprint],
  ["Pixel Hash", (p) => p.pixelHash],
  ["Capture Source", (p) => p.captureSource],
  ["Vaulted At", (p) => p.vaultedAt],
  ["Amendments", (p) => String(amendmentHistory(p).length)],
];

function csvCell(value: string): string {
  // Titles and provenance routinely contain commas and quotes, and a stray
  // newline would silently split a row when the file is reopened.
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Inventory export. Deliberately omits key credentials: this is the file that
// gets mailed around and opened in a spreadsheet.
export function buildCollectionCsv(pieces: VaultPiece[]): string {
  const header = CSV_COLUMNS.map(([name]) => csvCell(name)).join(",");
  const rows = pieces.map((piece) => CSV_COLUMNS.map(([, read]) => csvCell(read(piece))).join(","));
  return [header, ...rows].join("\n");
}

// Full backup, keys included — the only way to move a library between devices
// without losing the credentials. The UI warns before handing this over.
export function buildCollectionJson(pieces: VaultPiece[], sessionType: string | null, startedAt: string | null): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      sessionType,
      startedAt,
      pieceCount: pieces.length,
      containsKeyCredentials: true,
      pieces,
    },
    null,
    2,
  );
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

  // Corrections travel with the certificate. A record that has been amended
  // and one that never needed it must not look identical on paper.
  const amendments = amendmentHistory(piece);
  if (amendments.length > 0) {
    lines.push("", "AMENDMENTS", rule);
    amendments.forEach((amendment, i) => {
      lines.push(
        `${String(i + 1).padStart(2, "0")}. ${formatAmendmentDate(amendment.at)} — ${fieldLabel(amendment.field)}`,
        `    Was   ${amendment.from}`,
        `    Now   ${amendment.to}`,
        `    Why   ${amendment.reason}`,
      );
    });
    lines.push(
      "",
      "Amendments correct the description only. The vault ID, fingerprint,",
      "pixel hash, and key credential above are unchanged since sealing.",
    );
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
    amendments: [],
    thumbnailUrl,
  };
}
