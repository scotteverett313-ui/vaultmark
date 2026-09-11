"use client";

import PieceThumb from "@/components/PieceThumb";
import StatusPill from "@/components/StatusPill";
import type { VaultPiece } from "@/lib/types";

interface PieceCardProps {
  piece: VaultPiece;
  onDownloadKey: (piece: VaultPiece) => void;
  onOpen: (piece: VaultPiece) => void;
}

export default function PieceCard({ piece, onDownloadKey, onOpen }: PieceCardProps) {
  return (
    <article className="flex flex-col bg-vm-surface ring-1 ring-vm-border transition-colors hover:bg-vm-raised">
      <div className="relative aspect-square w-full overflow-hidden bg-vm-bg">
        <PieceThumb piece={piece} />
        <div className="absolute right-2 top-2">
          <StatusPill status={piece.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-vm-border p-3">
        <h3 className="truncate font-vm-serif text-[16px] italic text-vm-ink" title={piece.title}>
          {piece.title}
        </h3>
        <p className="truncate text-[11px] text-vm-mid" title={piece.artist}>
          {piece.artist}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="truncate text-[10px] tracking-[0.06em] text-vm-dim">{piece.certificateNumber}</span>
          <span className="flex-shrink-0 text-[10px] text-vm-gold-2">{piece.qrSymbol}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-vm-border bg-vm-border">
        <button
          type="button"
          onClick={() => onDownloadKey(piece)}
          className="bg-vm-panel px-2 py-2 font-vm-mono text-[10px] uppercase tracking-[0.08em] text-vm-dim transition-colors hover:bg-vm-gold-bg hover:text-vm-gold"
        >
          ↓ Key
        </button>
        <button
          type="button"
          onClick={() => onOpen(piece)}
          className="bg-vm-panel px-2 py-2 font-vm-mono text-[10px] uppercase tracking-[0.08em] text-vm-dim transition-colors hover:bg-vm-gold-bg hover:text-vm-gold"
        >
          View →
        </button>
      </div>
    </article>
  );
}
