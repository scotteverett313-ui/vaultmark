"use client";

import { useEffect, useRef } from "react";
import { QR_MODULE_COUNT, QR_SYMBOL_SEEDS, generateQRPattern } from "@/lib/engine";
import type { QRSymbolId } from "@/lib/types";

const SYMBOLS = Object.keys(QR_SYMBOL_SEEDS) as QRSymbolId[];

interface QRSymbolGridProps {
  selected: QRSymbolId;
  onSelect: (symbol: QRSymbolId) => void;
}

export default function QRSymbolGrid({ selected, onSelect }: QRSymbolGridProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="QR symbol">
      {SYMBOLS.map((symbol) => (
        <button
          key={symbol}
          type="button"
          role="radio"
          aria-checked={selected === symbol}
          onClick={() => onSelect(symbol)}
          className={`flex flex-col items-center gap-1 border p-1.5 transition-colors ${
            selected === symbol
              ? "border-vm-gold bg-vm-gold-bg"
              : "border-vm-border bg-vm-bg hover:border-vm-gold-2"
          }`}
        >
          <SymbolSwatch symbol={symbol} />
          <span className={`text-[8px] ${selected === symbol ? "text-vm-gold" : "text-vm-dim"}`}>{symbol}</span>
        </button>
      ))}
    </div>
  );
}

function SymbolSwatch({ symbol }: { symbol: QRSymbolId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const pattern = generateQRPattern(QR_SYMBOL_SEEDS[symbol]);
    const cell = canvas.width / QR_MODULE_COUNT;
    ctx.fillStyle = "#16161C";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pattern.forEach((row, r) =>
      row.forEach((on, c) => {
        if (!on) return;
        ctx.fillStyle = "#C8A84A";
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }),
    );
  }, [symbol]);

  return <canvas ref={ref} width={42} height={42} className="w-full [image-rendering:pixelated]" />;
}
