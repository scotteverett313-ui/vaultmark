"use client";

import { useEffect, useRef } from "react";

export interface PipelineFrame {
  label: string;
  // null while the stage has nothing to show yet — the last two frames only
  // exist once the key has been generated.
  draw: ((canvas: HTMLCanvasElement) => void) | null;
}

// Layout only: the strip owns the frames and their sizing, the caller owns
// the pixels, so every drawing decision stays next to the engine calls.
export default function PipelineStrip({ frames }: { frames: PipelineFrame[] }) {
  return (
    <div className="flex gap-px overflow-x-auto border-b border-vm-border bg-vm-border lg:grid lg:grid-cols-6 lg:overflow-visible">
      {frames.map((frame, i) => (
        <Frame key={frame.label} index={i} frame={frame} />
      ))}
    </div>
  );
}

function Frame({ index, frame }: { index: number; frame: PipelineFrame }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!frame.draw) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    frame.draw(canvas);
  }, [frame]);

  return (
    <div className="flex min-w-[132px] flex-1 flex-col gap-1.5 bg-vm-surface p-2.5">
      <div className="text-lg font-bold leading-none text-vm-border-2">{String(index + 1).padStart(2, "0")}</div>
      <div className="text-[8px] uppercase tracking-[0.08em] text-vm-dim">{frame.label}</div>
      <div className="flex flex-1 items-center justify-center overflow-hidden border border-vm-border bg-vm-bg">
        {frame.draw ? (
          <canvas ref={ref} className="block h-auto max-h-[120px] w-full [image-rendering:pixelated]" />
        ) : (
          <span className="p-2 text-center text-[8px] text-vm-dim">—</span>
        )}
      </div>
    </div>
  );
}
