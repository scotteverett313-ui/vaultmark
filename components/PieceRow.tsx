import ScaffoldNotice from "@/components/internal/ScaffoldNotice";
import type { VaultPiece } from "@/lib/types";

interface PieceRowProps {
  piece: VaultPiece;
  onOpen?: (piece: VaultPiece) => void;
}

export default function PieceRow(_props: PieceRowProps) {
  return <ScaffoldNotice component="PieceRow" buildStep="Step 11 — Dashboard screen" />;
}
