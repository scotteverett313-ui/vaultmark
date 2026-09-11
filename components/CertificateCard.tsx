import { amendmentHistory, fieldLabel, formatAmendmentDate } from "@/lib/amend";
import type { VaultPiece } from "@/lib/types";

export default function CertificateCard({ piece }: { piece: VaultPiece }) {
  const issued = new Date(piece.vaultedAt);
  const issuedLabel = Number.isNaN(issued.getTime())
    ? piece.vaultedAt
    : issued.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const amendments = amendmentHistory(piece);

  return (
    <div className="w-full border border-vm-border bg-vm-surface p-5 font-vm-mono">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-vm-border-2 pb-3">
        <div>
          <div className="text-[13px] font-bold tracking-[0.2em] text-vm-gold">VAULTMARK</div>
          <div className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-vm-dim">Certificate of Authenticity</div>
        </div>
        <div className="text-right text-[9px] leading-relaxed text-vm-dim">
          <div className="text-vm-gold">{piece.certificateNumber}</div>
          <div>{issuedLabel}</div>
        </div>
      </div>

      <div className="flex gap-4">
        {piece.thumbnailUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={piece.thumbnailUrl}
            alt=""
            className="h-16 w-16 flex-shrink-0 border border-vm-border object-cover"
          />
        )}
        <div className="min-w-0">
          <div className="font-vm-serif text-base font-bold italic leading-tight text-vm-ink">{piece.title}</div>
          <div className="mt-1 text-[11px] text-vm-mid">
            {piece.artist} · {piece.year}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px bg-vm-border">
        <CertCell label="Medium" value={piece.medium} />
        <CertCell label="Dimensions" value={piece.dimensions} />
        <CertCell label="Edition" value={piece.edition} />
        <CertCell label="QR Symbol" value={piece.qrSymbol} />
        <CertCell label="Masked Pixels" value={String(piece.maskedPixelCount)} />
        <CertCell label="Capture" value={piece.captureSource === "camera" ? "Camera — lossy" : "Upload — lossless"} />
        <CertCell className="col-span-2" label="Image Fingerprint" value={piece.imageFingerprint} />
        <CertCell className="col-span-2" label="Pixel Hash" value={piece.pixelHash} />
      </div>

      {amendments.length > 0 && (
        <div className="mt-3.5 border-t border-vm-border pt-2.5">
          <div className="mb-1.5 text-[8px] uppercase tracking-wider text-vm-dim">
            Amendments · {amendments.length}
          </div>
          <ol className="flex flex-col gap-1">
            {amendments.map((amendment, i) => (
              <li key={`${amendment.at}-${i}`} className="text-[8px] leading-[1.7] text-vm-mid">
                <span className="text-vm-dim">{formatAmendmentDate(amendment.at)} · </span>
                <span className="text-vm-ink">{fieldLabel(amendment.field)}</span>
                <span className="text-vm-dim"> — was </span>
                <span className="break-words">{amendment.from}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-vm-border pt-2.5 text-[8px] tracking-[0.08em] text-vm-dim">
        <span>{piece.gallery !== "—" ? piece.gallery : "Independent"}</span>
        <span>{piece.signatory !== "—" ? piece.signatory : piece.artist}</span>
      </div>
    </div>
  );
}

function CertCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-vm-surface px-2.5 py-2 ${className ?? ""}`}>
      <div className="mb-0.5 text-[8px] uppercase tracking-wider text-vm-dim">{label}</div>
      <div className="break-words text-[10px] leading-[1.6] text-vm-ink">{value}</div>
    </div>
  );
}
