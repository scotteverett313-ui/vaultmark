import SVGThumb from "@/components/SVGThumb";
import type { VaultPiece } from "@/lib/types";

// Sealed pieces carry a real thumbnail of the vaulted square. SVGThumb is the
// fallback for a record that arrives without one — a piece restored from an
// older storage blob, or one whose capture happened where canvas was blocked.
export default function PieceThumb({ piece, size = 200 }: { piece: VaultPiece; size?: number }) {
  if (piece.thumbnailUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={piece.thumbnailUrl} alt="" className="h-full w-full object-cover" />
    );
  }

  return <SVGThumb seedId={piece.id} qrSymbol={piece.qrSymbol} size={size} />;
}
