import ScaffoldNotice from "@/components/internal/ScaffoldNotice";
import type { VaultPiece } from "@/lib/types";

interface PieceModalProps {
  piece: VaultPiece | null;
  onClose: () => void;
}

export default function PieceModal(_props: PieceModalProps) {
  return <ScaffoldNotice component="PieceModal" buildStep="Step 12 — Piece Detail Modal" />;
}
