import type { PieceStatus } from "@/lib/types";

const STATUS_STYLES: Record<PieceStatus, string> = {
  Vaulted: "bg-vm-green text-white",
  Listed: "bg-vm-blue text-white",
  Sold: "bg-vm-amber text-white",
  "On Loan": "border border-vm-border-2 bg-transparent text-vm-mid",
};

export default function StatusPill({ status }: { status: PieceStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 font-vm-mono text-[7px] uppercase tracking-wider ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
