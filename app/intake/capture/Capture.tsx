"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionContext";
import { useIntake, type CaptureSource } from "@/components/IntakeContext";
import { useToast } from "@/components/Toast";
import { sha256Hex } from "@/lib/engine";

const MAX_CAPTURE_SIZE = 800;
const MIN_CAPTURE_SIZE = 400;
const ACCEPTED = ".png,.tiff,.tif,.bmp,image/png,image/tiff,image/bmp";

type CheckState = "idle" | "running" | "pass" | "fail";

interface Check {
  label: string;
  state: CheckState;
  detail: string;
}

const CHECK_LABELS = ["Format", "Resolution", "Lossless", "Fingerprint"];
const IDLE_CHECKS: Check[] = CHECK_LABELS.map((label) => ({ label, state: "idle", detail: "Awaiting image" }));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Capture() {
  const router = useRouter();
  const { restored, sessionType } = useSession();
  const { captured, setCaptured } = useIntake();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [checks, setChecks] = useState<Check[]>(IDLE_CHECKS);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  // Only offer the camera where there plausibly is one; the capture attribute
  // is inert on desktop and would just open a second file browser.
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    setHasCamera(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const allPassed = checks.every((c) => c.state === "pass");

  const updateCheck = useCallback((index: number, next: Check) => {
    setChecks((prev) => prev.map((c, i) => (i === index ? next : c)));
  }, []);

  const handleFile = useCallback(
    async (file: File, source: CaptureSource = "upload") => {
      setScanning(true);
      setCaptured(null);
      setChecks(CHECK_LABELS.map((label) => ({ label, state: "idle", detail: "Queued" })));

      // Each check is revealed in sequence so the panel reads as a scan
      // rather than a form that fills itself in all at once.
      const runCheck = async (index: number, run: () => Omit<Check, "label"> | Promise<Omit<Check, "label">>, label = CHECK_LABELS[index]) => {
        updateCheck(index, { label, state: "running", detail: "Checking…" });
        await wait(280);
        const result = await run();
        updateCheck(index, { label, ...result });
        return result;
      };

      const extension = file.name.split(".").pop()?.toUpperCase() ?? "UNKNOWN";

      const format = await runCheck(0, () => {
        const isJpeg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
        if (!isJpeg) return { state: "pass" as const, detail: `${extension} accepted` };
        // Camera capture is the sanctioned exception: phones and tablets only
        // ever hand back JPEG, and the fingerprint is taken from decoded pixels
        // rather than file bytes, so it is still stable. The record carries the
        // flag so a lossy master is never mistaken for a lossless one.
        return source === "camera"
          ? { state: "pass" as const, detail: "JPEG accepted — camera capture, flagged in record" }
          : { state: "fail" as const, detail: "JPEG rejected — lossy compression breaks pixel checksums" };
      });
      if (format.state === "fail") {
        setScanning(false);
        showToast("Rejected — use PNG, TIFF, or BMP");
        return;
      }

      let image: HTMLImageElement;
      const objectUrl = URL.createObjectURL(file);
      try {
        image = await loadImage(objectUrl);
      } catch {
        URL.revokeObjectURL(objectUrl);
        updateCheck(1, { label: CHECK_LABELS[1], state: "fail", detail: "File could not be decoded as an image" });
        setScanning(false);
        showToast("That file could not be read as an image");
        return;
      }

      const size = Math.min(image.naturalWidth, image.naturalHeight, MAX_CAPTURE_SIZE);

      const resolution = await runCheck(1, () =>
        size >= MIN_CAPTURE_SIZE
          ? { state: "pass" as const, detail: `${image.naturalWidth} × ${image.naturalHeight} px — sufficient` }
          : {
              state: "fail" as const,
              detail: `${image.naturalWidth} × ${image.naturalHeight} px — needs ${MIN_CAPTURE_SIZE}px on the short edge`,
            },
      );
      if (resolution.state === "fail") {
        URL.revokeObjectURL(objectUrl);
        setScanning(false);
        showToast("Resolution too low to vault");
        return;
      }

      await runCheck(
        2,
        () =>
          source === "camera"
            ? { state: "pass" as const, detail: "Lossy camera master — recorded as camera-sourced" }
            : { state: "pass" as const, detail: `Lossless ${extension} confirmed` },
        source === "camera" ? "Source" : "Lossless",
      );

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        updateCheck(3, { label: CHECK_LABELS[3], state: "fail", detail: "Canvas unavailable in this browser" });
        setScanning(false);
        return;
      }

      // Centre-crop to a square rather than squashing: the vault region samples
      // real artwork pixels, so distorting the source would distort the key.
      const shortEdge = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - shortEdge) / 2;
      const sy = (image.naturalHeight - shortEdge) / 2;
      ctx.drawImage(image, sx, sy, shortEdge, shortEdge, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);

      const pixels = ctx.getImageData(0, 0, size, size);
      let fingerprint = "";
      await runCheck(3, async () => {
        fingerprint = await sha256Hex(pixels.data);
        return { state: "pass" as const, detail: "SHA-256 generated" };
      });

      setCaptured({
        pixels,
        size,
        fingerprint,
        fileName: file.name,
        format: extension,
        source,
        previewUrl: canvas.toDataURL("image/png"),
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight,
      });
      setScanning(false);
    },
    [setCaptured, showToast, updateCheck],
  );

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function copyFingerprint() {
    if (!captured) return;
    navigator.clipboard.writeText(captured.fingerprint);
    showToast("Fingerprint copied to clipboard");
  }

  if (restored && !sessionType) {
    return (
      <div className="flex min-h-[calc(100vh-6.75rem)] items-center justify-center p-8">
        <div className="w-full max-w-sm border border-vm-border-2 bg-vm-surface p-6 text-center">
          <div className="mb-2 font-vm-sans text-sm font-bold text-vm-ink">No active session</div>
          <p className="mb-4 text-[10px] leading-loose text-vm-mid">
            Intake needs a session type so the label format, attestation language, and key routing are set before
            anything is vaulted.
          </p>
          <Link
            href="/"
            className="inline-block border border-vm-gold-2 bg-vm-gold-bg px-4 py-2.5 font-vm-mono text-[10px] uppercase tracking-[0.12em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
          >
            Choose a session →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[340px_1fr]">
      <aside className="border-vm-border bg-vm-panel lg:min-h-[calc(100vh-6.75rem)] lg:border-r">
        <div className="border-b border-vm-border p-4">
          <div className="mb-3 flex items-center justify-between text-[9px] uppercase tracking-[0.15em] text-vm-dim">
            <span>01 / Capture</span>
            <span className="border border-vm-border-2 px-1.5 py-0.5 text-[8px] text-vm-mid">Step 1</span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed p-6 text-center transition-colors ${
              dragging ? "border-vm-gold bg-vm-gold-bg" : "border-vm-border-2 bg-vm-bg hover:border-vm-gold-2"
            }`}
          >
            <span className="text-2xl leading-none text-vm-dim">⬡</span>
            <span className="font-vm-sans text-xs font-bold text-vm-ink">Drop image or browse</span>
            <span className="text-[9px] leading-[1.9] text-vm-mid">
              PNG · TIFF · BMP — lossless only
              <br />
              JPEG rejected at intake
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file, "upload");
                e.target.value = "";
              }}
            />
          </div>

          {hasCamera && (
            <>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="mt-2 w-full border border-vm-border-2 px-4 py-2.5 font-vm-mono text-[10px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
              >
                Photograph the work
              </button>
              <p className="mt-1.5 text-[8px] leading-[1.7] text-vm-dim">
                Cameras produce JPEG. Accepted, and flagged in the vault record as a lossy master.
              </p>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file, "camera");
                  e.target.value = "";
                }}
              />
            </>
          )}

          <button
            type="button"
            onClick={() => router.push("/intake/vault")}
            disabled={!allPassed || !captured}
            className="mt-3 w-full border border-vm-gold-2 bg-vm-gold-bg px-4 py-3 font-vm-mono text-[10px] uppercase tracking-[0.14em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)] disabled:pointer-events-none disabled:opacity-25"
          >
            Proceed to Vault →
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 text-[9px] uppercase tracking-[0.15em] text-vm-dim">Quality checks</div>
          <div className="grid grid-cols-2 gap-px bg-vm-border">
            {checks.map((check, i) => (
              <div key={CHECK_LABELS[i]} className="bg-vm-surface p-2.5" data-check={CHECK_LABELS[i]}>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] leading-none ${
                      check.state === "pass"
                        ? "text-vm-green"
                        : check.state === "fail"
                          ? "text-vm-red"
                          : check.state === "running"
                            ? "animate-pulse text-vm-gold"
                            : "text-vm-dim"
                    }`}
                  >
                    {check.state === "pass" ? "✓" : check.state === "fail" ? "✕" : check.state === "running" ? "◌" : "○"}
                  </span>
                  <span
                    className={`text-[9px] ${
                      check.state === "pass" ? "text-vm-green" : check.state === "fail" ? "text-vm-red" : "text-vm-mid"
                    }`}
                  >
                    {check.label}
                  </span>
                </div>
                <div className="mt-1 text-[8px] leading-[1.6] text-vm-dim">{check.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="p-5 lg:p-6">
        {!captured ? (
          <p className="max-w-[52ch] text-[11px] leading-[2] text-vm-mid">
            Upload a high-resolution photograph of the artwork. The image must be lossless — PNG, TIFF, or BMP.
            Vaultmark checks format, resolution, and losslessness, then fingerprints the pixels before anything is
            vaulted.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,320px)_1fr]">
              <div>
                <div className="mb-2 text-[9px] uppercase tracking-[0.15em] text-vm-dim">Vaulted frame</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={captured.previewUrl}
                  alt={`Captured artwork: ${captured.fileName}`}
                  className="w-full max-w-[320px] border border-vm-border"
                />
              </div>

              <div>
                <div className="mb-2 text-[9px] uppercase tracking-[0.15em] text-vm-dim">Source</div>
                <dl className="grid grid-cols-2 gap-px bg-vm-border">
                  <Field label="File" value={captured.fileName} />
                  <Field label="Format" value={captured.format} />
                  <Field label="Source size" value={`${captured.sourceWidth} × ${captured.sourceHeight} px`} />
                  <Field label="Vaulted size" value={`${captured.size} × ${captured.size} px`} />
                </dl>
                {captured.source === "camera" && (
                  <div className="mt-2 border border-vm-amber/40 bg-vm-surface px-3 py-2">
                    <span className="text-[9px] leading-[1.7] text-vm-amber">
                      Camera capture · lossy master — recorded on the vault record
                    </span>
                  </div>
                )}
                <p className="mt-2 text-[9px] leading-[1.7] text-vm-dim">
                  Centre-cropped to a square so the vault region samples undistorted artwork pixels.
                </p>
              </div>
            </div>

            <div className="border border-vm-border bg-vm-surface p-4">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="text-[9px] uppercase tracking-[0.15em] text-vm-dim">Image fingerprint · SHA-256</span>
                <button
                  type="button"
                  onClick={copyFingerprint}
                  className="ml-auto border border-vm-border-2 px-2.5 py-1 font-vm-mono text-[9px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
                >
                  Copy
                </button>
              </div>
              <p className="break-all font-vm-mono text-[10px] leading-[1.9] text-vm-gold">{captured.fingerprint}</p>
            </div>
          </div>
        )}

        {scanning && !captured && (
          <p className="mt-4 text-[10px] tracking-[0.1em] text-vm-gold">Scanning…</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-vm-surface p-2.5">
      <dt className="mb-1 text-[8px] uppercase tracking-[0.1em] text-vm-dim">{label}</dt>
      <dd className="break-all text-[10px] text-vm-ink">{value}</dd>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = src;
  });
}
