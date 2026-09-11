"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PipelineStrip, { type PipelineFrame } from "@/components/PipelineStrip";
import QRSymbolGrid from "@/components/QRSymbolGrid";
import { useIntake } from "@/components/IntakeContext";
import { useSession } from "@/components/SessionContext";
import {
  QR_MODULE_COUNT,
  QR_SYMBOL_SEEDS,
  computeRegion,
  cropRegion,
  extractMaskedPixels,
  generateQRPattern,
  runVaultEngine,
  samplePixelGrid,
  type MaskedPixel,
  type RunVaultEngineResult,
} from "@/lib/engine";
import type { QRSymbolId } from "@/lib/types";

const PREVIEW_SIZE = 200;
const PRESETS = [
  { label: "Standard", zoom: 8 },
  { label: "Fine", zoom: 5 },
  { label: "Coarse", zoom: 12 },
];

export default function Vault() {
  const router = useRouter();
  const { sessionType, restored } = useSession();
  const { captured, setVault } = useIntake();

  const [qrSymbol, setQrSymbol] = useState<QRSymbolId>("VM-A");
  const [regionX, setRegionX] = useState(30);
  const [regionY, setRegionY] = useState(30);
  const [zoomLevel, setZoomLevel] = useState(8);
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<RunVaultEngineResult | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  const source = useMemo(() => {
    if (!captured) return null;
    const canvas = document.createElement("canvas");
    canvas.width = captured.size;
    canvas.height = captured.size;
    canvas.getContext("2d")?.putImageData(captured.pixels, 0, 0);
    return canvas;
  }, [captured]);

  // Live preview recomputes on every control change. It deliberately skips
  // the whole-image SHA-256 that runVaultEngine does — that only needs to
  // happen once, when the key is actually generated.
  const preview = useMemo(() => {
    if (!captured) return null;
    const region = computeRegion(captured.size, zoomLevel, regionX, regionY);
    const regionBuffer = cropRegion(captured.pixels, region);
    const pattern = generateQRPattern(QR_SYMBOL_SEEDS[qrSymbol]);
    return {
      region,
      pattern,
      grid: samplePixelGrid(regionBuffer, zoomLevel),
      masked: extractMaskedPixels(regionBuffer, zoomLevel, pattern),
    };
  }, [captured, zoomLevel, regionX, regionY, qrSymbol]);

  async function generateKey() {
    if (!captured || generating) return;
    setGenerating(true);
    setProgress(20);

    const engineResult = await runVaultEngine({
      vaultId: `VMRK-${Date.now().toString(36).toUpperCase()}`,
      fullImage: captured.pixels,
      regionX,
      regionY,
      zoomLevel,
      qrSymbol,
      issuedAt: new Date().toISOString(),
    });

    setProgress(70);
    setResult(engineResult);
    setVault({ key: engineResult.key, encodedKey: engineResult.encodedKey });
    setProgress(100);
    setGenerating(false);

    advanceRef.current = setTimeout(() => router.push("/intake/label"), 800);
  }

  if (restored && !sessionType) return <Gate href="/" cta="Choose a session →" title="No active session" body="Intake needs a session type before anything can be vaulted." />;
  if (!captured) return <Gate href="/intake/capture" cta="Go to capture →" title="No image captured" body="The vault step works on the fingerprinted image from step 1. Upload or photograph the artwork first." />;

  const frames: PipelineFrame[] = [
    { label: "Original", draw: (c) => source && drawScaled(c, source) },
    { label: "Region", draw: (c) => source && preview && drawRegion(c, source, captured.size, preview.region) },
    { label: "Pixel Grid", draw: (c) => preview && drawPixelGrid(c, preview.grid, zoomLevel) },
    { label: "QR Mask", draw: (c) => preview && drawMask(c, preview.grid, preview.pattern, zoomLevel) },
    { label: "Key Extract", draw: result ? (c) => drawPixels(c, result.maskedPixels, zoomLevel) : null },
    { label: "Scrambled", draw: result ? (c) => drawPixels(c, result.scrambledPixels, zoomLevel) : null },
  ];

  return (
    <div className="grid lg:grid-cols-[340px_1fr]">
      <aside className="border-vm-border bg-vm-panel lg:min-h-[calc(100vh-6.75rem)] lg:border-r">
        <div className="border-b border-vm-border p-4">
          <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.15em] text-vm-dim">
            <span>02 / Vault Settings</span>
            <span className="border border-vm-border-2 px-1.5 py-0.5 text-[10px] text-vm-mid">Step 2</span>
          </div>

          <div className="mb-3 text-[11px] uppercase tracking-[0.15em] text-vm-dim">QR Symbol</div>
          <QRSymbolGrid selected={qrSymbol} onSelect={setQrSymbol} />

          <div className="mt-4 mb-3 flex items-center gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setZoomLevel(preset.zoom)}
                className={`flex-1 border px-2 py-1.5 font-vm-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  zoomLevel === preset.zoom
                    ? "border-vm-gold bg-vm-gold-bg text-vm-gold"
                    : "border-vm-border text-vm-mid hover:border-vm-gold-2 hover:text-vm-gold"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Slider label="Region X" value={regionX} min={0} max={80} onChange={setRegionX} suffix="%" />
          <Slider label="Region Y" value={regionY} min={0} max={80} onChange={setRegionY} suffix="%" />
          <Slider label="Zoom" value={zoomLevel} min={4} max={14} onChange={setZoomLevel} suffix="px" />

          <div className="mt-3 h-px overflow-hidden bg-vm-border">
            <div className="h-full bg-vm-gold transition-[width] duration-150" style={{ width: `${progress}%` }} />
          </div>

          <button
            type="button"
            onClick={generateKey}
            disabled={generating}
            className="mt-3 w-full border border-vm-gold-2 bg-vm-gold-bg px-4 py-3 font-vm-mono text-[13px] uppercase tracking-[0.14em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)] disabled:pointer-events-none disabled:opacity-40"
          >
            {generating ? "Generating…" : result ? "Regenerate Pixel Key" : "Generate Pixel Key"}
          </button>

          {result && (
            <p className="mt-2 text-[11px] leading-[1.7] text-vm-green">
              Key issued for {result.key.maskedCount} masked pixels. Continuing to label…
            </p>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <PipelineStrip frames={frames} />

        <dl className="grid grid-cols-2 gap-px border-b border-vm-border bg-vm-border lg:grid-cols-4">
          <Stat label="Pixels Read" value={String(QR_MODULE_COUNT * QR_MODULE_COUNT)} />
          <Stat label="Masked" value={preview ? String(preview.masked.length) : "—"} />
          <Stat label="QR Symbol" value={qrSymbol} />
          <Stat label="Key Hash" value={result ? `${result.key.pixelHash.slice(0, 8)}…` : "—"} />
        </dl>

        <div className="grid gap-px bg-vm-border lg:grid-cols-2">
          <DetailPanel
            title="Pixel Grid — Zoomed"
            draw={(c) => preview && drawPixelGrid(c, preview.grid, zoomLevel)}
            deps={[preview, zoomLevel]}
            readouts={[
              ["Region X", `${regionX}%`],
              ["Region Y", `${regionY}%`],
              ["Zoom", `${zoomLevel}px`],
              ["Px Count", String(QR_MODULE_COUNT * QR_MODULE_COUNT)],
            ]}
          />
          <DetailPanel
            title="QR Mask Overlay"
            draw={(c) => preview && drawMask(c, preview.grid, preview.pattern, zoomLevel)}
            deps={[preview, zoomLevel]}
            readouts={[
              ["Symbol", qrSymbol],
              ["Modules", String(QR_MODULE_COUNT * QR_MODULE_COUNT)],
              ["Masked", preview ? String(preview.masked.length) : "—"],
              ["Hash", result ? `${result.key.pixelHash.slice(0, 8)}…` : "—"],
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Gate({ href, cta, title, body }: { href: string; cta: string; title: string; body: string }) {
  return (
    <div className="flex min-h-[calc(100vh-6.75rem)] items-center justify-center p-8">
      <div className="w-full max-w-sm border border-vm-border-2 bg-vm-surface p-6 text-center">
        <div className="mb-2 font-vm-sans text-base font-bold text-vm-ink">{title}</div>
        <p className="mb-4 text-[13px] leading-loose text-vm-mid">{body}</p>
        <Link
          href={href}
          className="inline-block border border-vm-gold-2 bg-vm-gold-bg px-4 py-2.5 font-vm-mono text-[13px] uppercase tracking-[0.12em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  const id = `vm-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <label htmlFor={id} className="w-[70px] flex-shrink-0 text-[11px] uppercase tracking-[0.08em] text-vm-dim">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-px flex-1 appearance-none bg-vm-border accent-vm-gold outline-none"
      />
      <span className="min-w-[36px] text-right text-[13px] text-vm-gold">
        {value}
        {suffix}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-vm-panel px-3 py-2">
      <dt className="mb-0.5 text-[10px] uppercase tracking-[0.08em] text-vm-dim">{label}</dt>
      <dd className="text-[16px] font-bold text-vm-gold">{value}</dd>
    </div>
  );
}

function DetailPanel({
  title,
  draw,
  deps,
  readouts,
}: {
  title: string;
  draw: (canvas: HTMLCanvasElement) => void;
  deps: unknown[];
  readouts: [string, string][];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) draw(ref.current);
    // draw is recreated each render; deps describe what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div className="bg-vm-surface p-3.5">
      <div className="mb-2.5 text-[11px] uppercase tracking-[0.1em] text-vm-dim">{title}</div>
      <div className="flex items-center justify-center overflow-hidden border border-vm-border bg-vm-bg p-4">
        <canvas ref={ref} className="block h-auto w-full max-w-[280px] [image-rendering:pixelated]" />
      </div>
      <dl className="mt-2 grid grid-cols-4 gap-px bg-vm-border">
        {readouts.map(([label, value]) => (
          <div key={label} className="bg-vm-panel px-1.5 py-1">
            <dt className="text-[10px] text-vm-dim">{label}</dt>
            <dd className="text-[13px] font-bold text-vm-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function drawScaled(canvas: HTMLCanvasElement, source: HTMLCanvasElement) {
  canvas.width = PREVIEW_SIZE;
  canvas.height = PREVIEW_SIZE;
  canvas.getContext("2d")?.drawImage(source, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
}

function drawRegion(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  imageSize: number,
  region: { x: number; y: number; size: number },
) {
  canvas.width = PREVIEW_SIZE;
  canvas.height = PREVIEW_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = PREVIEW_SIZE / imageSize;

  ctx.drawImage(source, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  const dx = region.x * scale;
  const dy = region.y * scale;
  const ds = region.size * scale;
  ctx.drawImage(source, region.x, region.y, region.size, region.size, dx, dy, ds, ds);
  ctx.strokeStyle = "#C8A84A";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(dx + 0.75, dy + 0.75, ds - 1.5, ds - 1.5);
}

function drawPixelGrid(canvas: HTMLCanvasElement, grid: MaskedPixel[][], zoom: number) {
  const side = QR_MODULE_COUNT * zoom;
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  grid.forEach((row) =>
    row.forEach((cell) => {
      ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`;
      ctx.fillRect(cell.col * zoom, cell.row * zoom, zoom, zoom);
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cell.col * zoom + 0.25, cell.row * zoom + 0.25, zoom - 0.5, zoom - 0.5);
    }),
  );
}

function drawMask(canvas: HTMLCanvasElement, grid: MaskedPixel[][], pattern: number[][], zoom: number) {
  drawPixelGrid(canvas, grid, zoom);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  pattern.forEach((row, r) =>
    row.forEach((on, c) => {
      ctx.fillStyle = on ? "rgba(200,168,74,0.5)" : "rgba(0,0,0,0.5)";
      ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
    }),
  );
}

function drawPixels(canvas: HTMLCanvasElement, pixels: MaskedPixel[], zoom: number) {
  const side = QR_MODULE_COUNT * zoom;
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0C0C0E";
  ctx.fillRect(0, 0, side, side);
  pixels.forEach((p) => {
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    ctx.fillRect(p.col * zoom, p.row * zoom, zoom, zoom);
  });
}
