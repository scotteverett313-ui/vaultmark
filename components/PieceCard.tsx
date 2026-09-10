import ScaffoldNotice from "@/components/internal/ScaffoldNotice";
import type { VaultPiece } from "@/lib/types";

interface PieceCardProps {
  piece: VaultPiece;
  onOpen?: (piece: VaultPiece) => void;
}

export default function PieceCard(_props: PieceCardProps) {
  return <ScaffoldNotice component="PieceCard" buildStep="Step 11 — Dashboard screen" />;
}
