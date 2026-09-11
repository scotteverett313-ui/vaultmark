"use client";

import { useEffect, useRef, useState } from "react";
import PieceThumb from "@/components/PieceThumb";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { verifyKeyAgainstPiece, type KeyMatchResult } from "@/lib/verify";
import type { PieceStatus, VaultPiece } from "@/lib/types";

const STATUSES: PieceStatus[] = ["Vaulted", "Listed", "Sold", "On Loan"];

interface PieceModalProps {
  piece: VaultPiece | null;
  onClose: () => void;
  onStatusChange: (id: string, status: PieceStatus) => void;
  onDownloadKey: (piece: VaultPiece) => void;
  onDownloadCertificate: (piece: VaultPiece) => void;
}

export default function PieceModal({
  piece,
  onClose,
  onStatusChange,
  onDownloadKey,
  onDownloadCertificate,
}: PieceModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { showToast } = useToast();
  const [candidate, setCandidate] = useState("");
  const [result, setResult] = useState<KeyMatchResult | null>(null);

  // A native dialog brings Escape, the focus trap, and an inert background
  // with it — none of which are worth reimplementing.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (piece && !dialog.open) dialog.showModal();
    if (!piece && dialog.open) dialog.close();
  }, [piece]);

  useEffect(() => {
    setCandidate("");
    setResult(null);
  }, [piece?.id]);

  if (!piece) return <dialog ref={ref} className="hidden" />;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={`${piece.title} by ${piece.artist}`}
      className="m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-[rgba(9,9,12,0.92)] open:fixed open:inset-0 open:h-full open:w-full"
    >
      {/* The wrapper fills the dialog, so it — not the dialog — receives
          clicks landing outside the modal box. */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex h-full w-full items-start justify-center overflow-y-auto md:p-8"
      >
        <div className="w-full max-w-[860px] border-vm-border-2 bg-vm-panel md:border">
          <header className="flex items-start justify-between gap-4 border-b border-vm-border bg-vm-surface p-4">
            <div className="min-w-0">
              <h2 className="truncate font-vm-serif text-base italic text-vm-ink">{piece.title}</h2>
              <p className="mt-0.5 truncate text-[10px] text-vm-mid">
                {piece.artist} · {piece.year} · {piece.medium}
              </p>
              <span className="mt-2 inline-block border border-vm-gold-2 bg-vm-gold-bg px-2 py-0.5 text-[9px] tracking-[0.1em] text-vm-gold">
                {piece.certificateNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 border border-vm-border-2 px-3 py-2 font-vm-mono text-[10px] text-vm-mid transition-colors hover:border-vm-red hover:text-vm-red"
            >
              ✕ Close
            </button>
          </header>

          <div className="grid md:grid-cols-[280px_1fr]">
            <aside className="flex flex-col gap-3 border-b border-vm-border p-4 md:border-b-0 md:border-r">
              <div className="aspect-square w-full overflow-hidden border border-vm-border bg-vm-bg">
                <PieceThumb piece={piece} />
              </div>

              <div>
                <div className="mb-1.5 text-[9px] uppercase tracking-[0.1em] text-vm-dim">Status</div>
                <div className="grid grid-cols-2 gap-px bg-vm-border">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        onStatusChange(piece.id, status);
                        showToast(`${piece.certificateNumber} marked ${status}`);
                      }}
                      aria-pressed={piece.status === status}
                      className={`px-2 py-1.5 font-vm-mono text-[9px] uppercase tracking-[0.08em] transition-colors ${
                        piece.status === status
                          ? "bg-vm-gold-bg text-vm-gold"
                          : "bg-vm-surface text-vm-dim hover:text-vm-mid"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[9px] uppercase tracking-[0.1em] text-vm-dim">Key Credential</div>
                <div className="max-h-16 overflow-y-auto break-all border border-vm-gold-2 bg-vm-bg p-2 text-[8px] leading-[1.8] text-vm-gold">
                  {piece.key}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <ActionButton onClick={() => onDownloadKey(piece)} primary>
                  ↓ Key File
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    navigator.clipboard.writeText(piece.key);
                    showToast("Key copied to clipboard");
                  }}
                >
                  Copy Key
                </ActionButton>
                <ActionButton onClick={() => onDownloadCertificate(piece)}>↓ Certificate</ActionButton>
              </div>

              <div className="border border-vm-border bg-vm-bg p-3">
                <div className="mb-1.5 text-[9px] uppercase tracking-[0.08em] text-vm-dim">Verify a key</div>
                <p className="mb-2 text-[8px] leading-[1.7] text-vm-dim">
                  Checks a credential against this record. To test whether an image itself is the original, use the
                  public verify page.
                </p>
                <textarea
                  value={candidate}
                  onChange={(e) => setCandidate(e.target.value)}
                  placeholder="Paste a .vmk credential…"
                  aria-label="Key to verify"
                  className="min-h-[48px] w-full resize-y border border-vm-border bg-vm-surface p-2 font-vm-mono text-[9px] text-vm-ink outline-none focus:border-vm-gold-2"
                />
                <button
                  type="button"
                  onClick={() => setResult(verifyKeyAgainstPiece(candidate.trim(), piece))}
                  disabled={!candidate.trim()}
                  className="mt-1.5 w-full border border-vm-gold-2 bg-vm-gold-bg px-2 py-2 font-vm-mono text-[9px] uppercase tracking-[0.1em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)] disabled:pointer-events-none disabled:opacity-30"
                >
                  Run Verification
                </button>

                {result && (
                  <div
                    className={`mt-2 border p-2 ${result.pass ? "border-vm-green" : "border-vm-red"}`}
                    role="status"
                  >
                    <div className={`mb-1 text-[10px] font-bold ${result.pass ? "text-vm-green" : "text-vm-red"}`}>
                      {result.pass ? "✓ Key matches this record" : "✕ Key does not match"}
                    </div>
                    <ul className="flex flex-col gap-1">
                      {result.checks.map((check) => (
                        <li key={check.label} className="flex gap-1.5 text-[8px] leading-[1.6]">
                          <span className={check.pass ? "text-vm-green" : "text-vm-red"}>{check.pass ? "✓" : "✕"}</span>
                          <span className="text-vm-mid">
                            <span className="text-vm-ink">{check.label}</span> — {check.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>

            <div className="max-h-none overflow-y-auto p-4 md:max-h-[70vh]">
              <Section title="Artwork" />
              <Row label="Title" value={piece.title} />
              <Row label="Artist" value={piece.artist} />
              <Row label="Year" value={piece.year} />
              <Row label="Medium" value={piece.medium} />
              <Row label="Dimensions" value={piece.dimensions} />
              <Row label="Edition" value={piece.edition} />

              <Section title="Vault Record" />
              <Row label="Vault ID" value={piece.id} gold />
              <Row label="Certificate" value={piece.certificateNumber} gold />
              <Row label="QR Symbol" value={piece.qrSymbol} />
              <Row label="Masked Pixels" value={String(piece.maskedPixelCount)} />
              <Row label="Image Fingerprint" value={piece.imageFingerprint} gold />
              <Row label="Pixel Hash" value={piece.pixelHash} gold />
              <Row label="Capture Source" value={piece.captureSource === "camera" ? "Camera — lossy master" : "Upload — lossless"} />
              <Row label="Vaulted At" value={piece.vaultedAt} />

              <Section title="Provenance" />
              <Row label="Provenance" value={piece.provenance} />
              <Row label="Appraised Value" value={piece.value} />
              <Row label="Appraiser" value={piece.appraiser} />
              <Row label="Notes" value={piece.notes} />

              {(piece.gallery !== "—" || piece.signatory !== "—") && (
                <>
                  <Section title="Gallery" />
                  <Row label="Gallery" value={piece.gallery} />
                  <Row label="Signatory" value={piece.signatory} />
                </>
              )}
            </div>
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-vm-border bg-vm-surface px-4 py-3">
            <span className="text-[9px] uppercase tracking-[0.1em] text-vm-dim">Status</span>
            <StatusPill status={piece.status} />
            <span className="ml-auto text-[9px] text-vm-dim">{piece.medium}</span>
          </footer>
        </div>
      </div>
    </dialog>
  );
}

function ActionButton({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-2 font-vm-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
        primary
          ? "border-vm-green bg-vm-green-bg text-vm-green hover:bg-[rgba(58,138,90,0.2)]"
          : "border-vm-border-2 text-vm-mid hover:border-vm-gold hover:text-vm-gold"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title }: { title: string }) {
  return (
    <h3 className="mb-2.5 mt-4 border-b border-vm-border pb-1.5 text-[9px] uppercase tracking-[0.12em] text-vm-dim first:mt-0">
      {title}
    </h3>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vm-border py-1.5 last:border-b-0">
      <span className="flex-shrink-0 text-[9px] text-vm-mid">{label}</span>
      <span className={`text-right text-[10px] ${gold ? "break-all text-vm-gold" : "break-words text-vm-ink"}`}>{value}</span>
    </div>
  );
}
