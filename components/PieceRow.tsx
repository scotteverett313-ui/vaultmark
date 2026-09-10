"use client";

import PieceThumb from "@/components/PieceThumb";
import StatusPill from "@/components/StatusPill";
import type { VaultPiece } from "@/lib/types";

export const ROW_GRID = "grid-cols-[48px_minmax(160px,1fr)_140px_150px_70px_100px_120px_150px]";

interface PieceRowProps {
  piece: VaultPiece;
  onDownloadKey: (piece: VaultPiece) => void;
  onDownloadCertificate: (piece: VaultPiece) => void;
}

export default function PieceRow({ piece, onDownloadKey, onDownloadCertificate }: PieceRowProps) {
  return (
    <div className={`grid ${ROW_GRID} border-b border-vm-border transition-colors hover:bg-vm-surface`}>
      <Cell>
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden border border-vm-border">
          <PieceThumb piece={piece} size={72} />
        </div>
      </Cell>
      <Cell className="truncate font-vm-serif text-[11px] italic text-vm-ink" title={piece.title}>
        {piece.title}
      </Cell>
      <Cell className="truncate text-[9px] text-vm-gold">{piece.certificateNumber}</Cell>
      <Cell className="truncate" title={piece.artist}>
        {piece.artist}
      </Cell>
      <Cell>{piece.year}</Cell>
      <Cell>
        <StatusPill status={piece.status} />
      </Cell>
      <Cell className="truncate text-vm-green">{piece.value}</Cell>
      <Cell>
        <div className="flex gap-1.5">
          <RowButton onClick={() => onDownloadKey(piece)}>↓ Key</RowButton>
          <RowButton onClick={() => onDownloadCertificate(piece)}>↓ Cert</RowButton>
        </div>
      </Cell>
    </div>
  );
}

function Cell({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div
      title={title}
      className={`flex items-center overflow-hidden border-r border-vm-border px-3 py-2.5 text-[10px] text-vm-mid last:border-r-0 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function RowButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="whitespace-nowrap border border-vm-border px-1.5 py-1 font-vm-mono text-[8px] uppercase text-vm-dim transition-colors hover:border-vm-gold hover:text-vm-gold"
    >
      {children}
    </button>
  );
}
