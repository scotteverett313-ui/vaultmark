import type { VaultPiece } from "@/lib/types";

interface CertificateCardProps {
  piece: VaultPiece;
  galleryName?: string;
  signatory?: string;
}

export default function CertificateCard({ piece, galleryName, signatory }: CertificateCardProps) {
  return (
    <div className="w-full border border-vm-border bg-vm-surface p-5 font-vm-mono">
      <div className="mb-4 flex items-start justify-between border-b border-vm-border-2 pb-3">
        <span className="text-[13px] font-bold tracking-[0.2em] text-vm-gold">VAULTMARK</span>
        <div className="text-right text-[9px] leading-loose text-vm-dim">
          <div>{piece.certificateNumber}</div>
          <div>{piece.vaultedAt}</div>
        </div>
      </div>
      <div className="mb-1 font-vm-serif text-base font-bold text-vm-ink">{piece.title}</div>
      <div className="mb-4 text-[11px] text-vm-mid">
        {piece.artist} · {piece.year}
      </div>
      <div className="grid grid-cols-2 gap-px bg-vm-border">
        <CertCell label="Medium" value={piece.medium} />
        <CertCell label="Dimensions" value={piece.dimensions} />
        <CertCell label="Edition" value={piece.edition} />
        <CertCell label="QR Symbol" value={piece.qrSymbol} />
        <CertCell label="Image Fingerprint" value={piece.imageFingerprint} />
        <CertCell label="Masked Pixels" value={String(piece.maskedPixelCount)} />
      </div>
      <div className="mt-3.5 flex items-center justify-between border-t border-vm-border pt-2.5 text-[8px] tracking-wider text-vm-dim">
        <span>{galleryName ?? "Independent"}</span>
        <span>{signatory ?? "—"}</span>
      </div>
    </div>
  );
}

function CertCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-vm-surface px-2.5 py-2">
      <div className="mb-0.5 text-[8px] uppercase tracking-wider text-vm-dim">{label}</div>
      <div className="text-[10px] text-vm-ink">{value}</div>
    </div>
  );
}
