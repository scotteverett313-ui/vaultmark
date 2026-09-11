"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PieceCard from "@/components/PieceCard";
import PieceModal from "@/components/PieceModal";
import PieceRow, { ROW_GRID } from "@/components/PieceRow";
import { useSession } from "@/components/SessionContext";
import { useToast } from "@/components/Toast";
import { buildCertificateText, buildCollectionCsv, buildCollectionJson } from "@/lib/records";
import type { PieceStatus, VaultPiece } from "@/lib/types";

const VIEW_KEY = "vaultmark:view";
const STATUSES: PieceStatus[] = ["Vaulted", "Listed", "Sold", "On Loan"];

type SortField = "title" | "certificateNumber" | "artist" | "year" | "status" | "value";

const COLUMNS: { label: string; field?: SortField }[] = [
  { label: "" },
  { label: "Title", field: "title" },
  { label: "Certificate", field: "certificateNumber" },
  { label: "Artist", field: "artist" },
  { label: "Year", field: "year" },
  { label: "Status", field: "status" },
  { label: "Value", field: "value" },
  { label: "Actions" },
];

export default function Library() {
  const router = useRouter();
  const { restored, sessionType, startedAt, pieces, persistFailed, updatePieceStatus, amendPiece } = useSession();
  const { showToast } = useToast();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PieceStatus>("all");
  const [artist, setArtist] = useState("all");
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortAsc, setSortAsc] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_KEY);
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {
      // Preference only; the default view is fine without it.
    }
  }, []);

  function chooseView(next: "grid" | "list") {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Preference only.
    }
  }

  const artists = useMemo(
    () => Array.from(new Set(pieces.map((p) => p.artist))).sort((a, b) => a.localeCompare(b)),
    [pieces],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pieces
      .filter((p) => {
        if (q && ![p.title, p.artist, p.medium].some((f) => f.toLowerCase().includes(q))) return false;
        if (status !== "all" && p.status !== status) return false;
        if (artist !== "all" && p.artist !== artist) return false;
        return true;
      })
      .sort((a, b) => {
        const result = String(a[sortField]).localeCompare(String(b[sortField]), undefined, { numeric: true });
        return sortAsc ? result : -result;
      });
  }, [pieces, query, status, artist, sortField, sortAsc]);

  function sortBy(field: SortField) {
    if (field === sortField) setSortAsc((v) => !v);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  function download(contents: string, filename: string, type: string, message: string) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(message);
  }

  const downloadKey = (p: VaultPiece) =>
    download(p.key, `${p.certificateNumber}-key.vmk`, "text/plain", `Key downloaded — ${p.certificateNumber}`);
  const downloadCertificate = (p: VaultPiece) =>
    download(
      buildCertificateText(p),
      `${p.certificateNumber}-certificate.txt`,
      "text/plain",
      `Certificate downloaded — ${p.certificateNumber}`,
    );

  const stamp = new Date().toISOString().slice(0, 10);

  if (restored && !sessionType) {
    return (
      <Empty
        title="No active session"
        body="The library holds the pieces vaulted in a session. Choose a session type to begin one."
        cta="Choose a session →"
        href="/"
      />
    );
  }

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px border-b border-vm-border bg-vm-border sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total Vaulted" value={String(pieces.length)} sub="This session" />
        <Stat label="Artists" value={String(artists.length)} sub="In collection" />
        <Stat label="Listed" value={String(pieces.filter((p) => p.status === "Listed").length)} sub="On marketplace" />
        <Stat label="Keys Issued" value={String(pieces.length)} sub="All delivered" />
        <Stat
          label="Session Date"
          value={startedAt ? new Date(startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          sub={sessionType === "gallery" ? "Gallery session" : "Private session"}
          small
        />
      </dl>

      {persistFailed && (
        <p className="border-b border-vm-border bg-vm-surface px-4 py-2 text-[9px] text-vm-amber">
          This browser is not saving the library. Download your keys and an export before closing.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-vm-border bg-vm-panel px-4 py-2.5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, artist, medium…"
          aria-label="Search pieces"
          className="min-w-[160px] flex-1 border border-vm-border bg-vm-surface px-2.5 py-1.5 font-vm-mono text-[10px] text-vm-ink outline-none transition-colors placeholder:text-vm-dim focus:border-vm-gold-2 sm:max-w-[240px]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | PieceStatus)}
          aria-label="Filter by status"
          className="cursor-pointer border border-vm-border bg-vm-surface px-2 py-1.5 font-vm-mono text-[10px] text-vm-mid outline-none focus:border-vm-gold-2"
        >
          <option value="all">All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          aria-label="Filter by artist"
          className="cursor-pointer border border-vm-border bg-vm-surface px-2 py-1.5 font-vm-mono text-[10px] text-vm-mid outline-none focus:border-vm-gold-2"
        >
          <option value="all">All Artists</option>
          {artists.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <span className="text-[9px] tracking-[0.1em] text-vm-dim">
          {visible.length === pieces.length
            ? `${pieces.length} work${pieces.length === 1 ? "" : "s"}`
            : `${visible.length} of ${pieces.length} works`}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-px bg-vm-border" role="group" aria-label="View">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => chooseView(v)}
                aria-pressed={view === v}
                aria-label={`${v} view`}
                className={`px-2.5 py-1.5 font-vm-mono text-xs transition-colors ${
                  view === v ? "bg-vm-gold-bg text-vm-gold" : "bg-vm-surface text-vm-dim hover:text-vm-mid"
                }`}
              >
                {v === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>

          {pieces.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => download(buildCollectionCsv(pieces), `vaultmark-collection-${stamp}.csv`, "text/csv", "Collection exported as CSV")}
                className="border border-vm-border px-2.5 py-1.5 font-vm-mono text-[9px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  download(
                    buildCollectionJson(pieces, sessionType, startedAt),
                    `vaultmark-backup-${stamp}.json`,
                    "application/json",
                    "Backup exported — contains key credentials",
                  );
                }}
                title="Full backup including key credentials"
                className="border border-vm-border px-2.5 py-1.5 font-vm-mono text-[9px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
              >
                Backup
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => router.push("/intake/capture")}
            className="whitespace-nowrap border border-vm-gold-2 bg-vm-gold-bg px-3 py-1.5 font-vm-mono text-[9px] uppercase tracking-[0.12em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
          >
            + Vault Artwork
          </button>
        </div>
      </div>

      {pieces.length === 0 ? (
        <Empty
          title="No pieces vaulted yet"
          body="Every artwork you vault in this session appears here, with its certificate and key."
          cta="+ Vault first artwork"
          href="/intake/capture"
        />
      ) : visible.length === 0 ? (
        <div className="p-16 text-center text-[11px] text-vm-dim">Nothing matches those filters.</div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-px p-px sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((piece) => (
            <PieceCard key={piece.id} piece={piece} onDownloadKey={downloadKey} onOpen={(p) => setOpenId(p.id)} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[840px]">
            <div className={`grid ${ROW_GRID} border-b-2 border-vm-border-2 bg-vm-panel`}>
              {COLUMNS.map((col, i) => (
                <button
                  key={col.label || i}
                  type="button"
                  disabled={!col.field}
                  onClick={() => col.field && sortBy(col.field)}
                  className={`border-r border-vm-border px-3 py-2 text-left text-[8px] uppercase tracking-[0.12em] transition-colors last:border-r-0 ${
                    col.field ? "cursor-pointer hover:text-vm-mid" : "cursor-default"
                  } ${col.field === sortField ? "text-vm-gold" : "text-vm-dim"}`}
                >
                  {col.label}
                  {col.field === sortField ? (sortAsc ? " ↑" : " ↓") : col.field ? " ↕" : ""}
                </button>
              ))}
            </div>
            {visible.map((piece) => (
              <PieceRow key={piece.id} piece={piece} onDownloadKey={downloadKey} onOpen={(p) => setOpenId(p.id)} />
            ))}
          </div>
        </div>
      )}

      <PieceModal
        piece={pieces.find((p) => p.id === openId) ?? null}
        onClose={() => setOpenId(null)}
        onStatusChange={updatePieceStatus}
        onDownloadKey={downloadKey}
        onDownloadCertificate={downloadCertificate}
        onAmend={amendPiece}
      />
    </div>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <div className="bg-vm-panel px-4 py-3">
      <dt className="mb-1 text-[8px] uppercase tracking-[0.14em] text-vm-dim">{label}</dt>
      <dd className={`font-bold leading-none text-vm-gold ${small ? "text-sm" : "text-xl"}`}>{value}</dd>
      <p className="mt-1 text-[9px] text-vm-dim">{sub}</p>
    </div>
  );
}

function Empty({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="text-4xl text-vm-border-2">⬡</div>
      <div className="font-vm-sans text-sm font-bold text-vm-ink">{title}</div>
      <p className="max-w-xs text-[10px] leading-loose text-vm-mid">{body}</p>
      <Link
        href={href}
        className="border border-vm-gold-2 bg-vm-gold-bg px-4 py-2.5 font-vm-mono text-[10px] uppercase tracking-[0.12em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
      >
        {cta}
      </Link>
    </div>
  );
}
