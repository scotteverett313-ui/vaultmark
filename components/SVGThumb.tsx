import type { QRSymbolId } from "@/lib/types";

interface SVGThumbProps {
  seedId: string;
  bg?: string;
  fg?: string;
  qrSymbol?: QRSymbolId;
  size?: number;
}

const QR_SEEDS: Record<QRSymbolId, number> = {
  "VM-A": 1337,
  "VM-B": 2674,
  "VM-C": 5318,
  "VM-D": 7991,
};

function seedFromId(id: string) {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) & 0xffffff;
  return s;
}

// Mulberry-style xorshift, matching the seeded PRNG used across the HTML prototypes
// so a given vault id always renders the same thumbnail.
function nextRandom(state: { s: number }) {
  state.s ^= state.s << 13;
  state.s ^= state.s >>> 17;
  state.s ^= state.s << 5;
  return (state.s >>> 0) / 0xffffffff;
}

export default function SVGThumb({
  seedId,
  bg = "#1a1a2a",
  fg = "#4a4a6a",
  qrSymbol = "VM-A",
  size = 200,
}: SVGThumbProps) {
  const state = { s: seedFromId(seedId) };
  const cell = 16;
  const cols = Math.ceil(size / cell);
  const rows = Math.ceil(size / cell);
  const rects: React.ReactNode[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = nextRandom(state);
      if (t > 0.5) {
        const alpha = (0.2 + t * 0.6).toFixed(2);
        rects.push(
          <rect
            key={`px-${r}-${c}`}
            x={c * cell}
            y={r * cell}
            width={cell - 1}
            height={cell - 1}
            fill={fg}
            opacity={alpha}
          />,
        );
      }
    }
  }

  const qrSize = 6;
  const qrCell = 8;
  const qrOff = Math.floor(size / 2 - (qrSize * qrCell) / 2);
  const qrState = { s: QR_SEEDS[qrSymbol] };

  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      if (nextRandom(qrState) > 0.4) {
        rects.push(
          <rect
            key={`qr-${r}-${c}`}
            x={qrOff + c * qrCell}
            y={qrOff + r * qrCell}
            width={qrCell - 1}
            height={qrCell - 1}
            fill="#c8a84a"
            opacity={0.6}
          />,
        );
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="block h-full w-full"
      role="img"
      aria-label={`Vault thumbnail for ${seedId}`}
    >
      <rect width={size} height={size} fill={bg} />
      {rects}
      <rect
        x={qrOff - 2}
        y={qrOff - 2}
        width={qrSize * qrCell + 4}
        height={qrSize * qrCell + 4}
        fill="none"
        stroke="#c8a84a"
        strokeWidth={1}
        opacity={0.4}
      />
    </svg>
  );
}
