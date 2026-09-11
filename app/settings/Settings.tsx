"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/ProfileContext";
import { useSession } from "@/components/SessionContext";
import { useToast } from "@/components/Toast";
import { mergeArtists } from "@/lib/profile";
import { parseBackup } from "@/lib/backup";
import { resetOnboarding } from "@/components/Onboarding";

export default function Settings() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const { sessionType, startedAt, pieces, sessionPieceCount, endSession, clearCollection, importPieces } = useSession();
  const { showToast } = useToast();
  const [newArtist, setNewArtist] = useState("");
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [confirmingErase, setConfirmingErase] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  async function restoreBackup(file: File) {
    setImportError(null);
    const outcome = parseBackup(await file.text());
    if (!outcome.ok) {
      setImportError(outcome.error);
      return;
    }

    const { added, skipped } = importPieces(outcome.backup.pieces);
    const rejected = outcome.backup.rejected;
    if (added === 0) {
      setImportError(
        skipped > 0
          ? `Already held — all ${skipped} ${skipped === 1 ? "record" : "records"} in that file are in your collection.`
          : "Nothing in that file could be restored.",
      );
      return;
    }
    showToast(
      `Restored ${added} ${added === 1 ? "record" : "records"}` +
        (skipped > 0 ? ` · ${skipped} already held` : "") +
        (rejected > 0 ? ` · ${rejected} unreadable` : ""),
    );
  }

  const roster = mergeArtists(
    profile.artists,
    pieces.map((p) => p.artist),
  );

  function addArtist() {
    const name = newArtist.trim();
    if (!name) return;
    if (profile.artists.some((a) => a.toLowerCase() === name.toLowerCase())) {
      showToast(`${name} is already on the roster`);
      setNewArtist("");
      return;
    }
    updateProfile({ artists: [...profile.artists, name] });
    setNewArtist("");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10 lg:py-14">
      <div>
        <h1 className="font-vm-sans text-3xl font-bold text-vm-ink">Settings</h1>
        <p className="mt-1.5 text-[14px] leading-[1.9] text-vm-mid">
          Stored in this browser only. Nothing here is sent anywhere.
        </p>
      </div>

      <Section
        title="Gallery profile"
        note="Pre-fills the gallery fields on every label, so they are typed once rather than per piece."
      >
        <Field
          id="galleryName"
          label="Gallery name"
          value={profile.galleryName}
          onChange={(v) => updateProfile({ galleryName: v })}
          placeholder="e.g. Meridian Gallery"
        />
        <Field
          id="location"
          label="Location"
          value={profile.location}
          onChange={(v) => updateProfile({ location: v })}
          placeholder="e.g. Detroit, MI"
        />
        <Field
          id="profileSignatory"
          label="Authorized signatory"
          value={profile.signatory}
          onChange={(v) => updateProfile({ signatory: v })}
          placeholder="e.g. M. Chen, Director"
        />
      </Section>

      <Section title="Artist roster" note="Suggested as you type an artist name on the label form.">
        <div className="flex gap-2">
          <input
            id="newArtist"
            value={newArtist}
            onChange={(e) => setNewArtist(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addArtist();
              }
            }}
            placeholder="Add an artist…"
            aria-label="Add an artist"
            className="flex-1 border border-vm-border bg-vm-surface px-2.5 py-2 font-vm-mono text-[14px] text-vm-ink outline-none transition-colors placeholder:text-vm-dim focus:border-vm-gold-2"
          />
          <button
            type="button"
            onClick={addArtist}
            className="border border-vm-gold-2 bg-vm-gold-bg px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
          >
            Add
          </button>
        </div>

        {roster.length === 0 ? (
          <p className="text-[13px] text-vm-dim">No artists yet. Anyone you vault this session is added automatically.</p>
        ) : (
          <ul className="flex flex-col gap-px bg-vm-border">
            {roster.map((name) => {
              const saved = profile.artists.some((a) => a.toLowerCase() === name.toLowerCase());
              return (
                <li key={name} className="flex items-center gap-3 bg-vm-panel px-3 py-2">
                  <span className="flex-1 truncate text-[13px] text-vm-ink">{name}</span>
                  {saved ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateProfile({ artists: profile.artists.filter((a) => a.toLowerCase() !== name.toLowerCase()) })
                      }
                      className="border border-vm-border px-2 py-0.5 font-vm-mono text-[10px] uppercase tracking-[0.1em] text-vm-dim transition-colors hover:border-vm-red hover:text-vm-red"
                    >
                      Remove
                    </button>
                  ) : (
                    <>
                      <span className="text-[10px] uppercase tracking-[0.1em] text-vm-dim">From this session</span>
                      <button
                        type="button"
                        onClick={() => updateProfile({ artists: [...profile.artists, name] })}
                        className="border border-vm-border px-2 py-0.5 font-vm-mono text-[10px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
                      >
                        Save
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Current session" note="Vaultmark keeps one session at a time in this browser.">
        {sessionType ? (
          <>
            <dl className="grid grid-cols-2 gap-px bg-vm-border">
              <Fact label="Type" value={sessionType === "gallery" ? "Gallery / Institution" : "Private Collector / Artist"} />
              <Fact label="Started" value={startedAt ? new Date(startedAt).toLocaleString() : "—"} />
              <Fact label="Vaulted this session" value={String(sessionPieceCount)} />
              <Fact label="Collection total" value={String(pieces.length)} />
            </dl>

            {confirmingEnd ? (
              <div className="border border-vm-red p-3">
                <p className="mb-2.5 text-[13px] leading-[1.8] text-vm-mid">
                  Ends this sitting and returns you to the start. Your {pieces.length}{" "}
                  {pieces.length === 1 ? "piece" : "pieces"} stay in the collection — to remove those, use Erase
                  collection below.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      endSession();
                      showToast("Session ended");
                      router.push("/");
                    }}
                    className="border border-vm-red px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-red transition-colors hover:bg-[rgba(138,58,58,0.2)]"
                  >
                    End session
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingEnd(false)}
                    className="border border-vm-border-2 px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="border border-vm-border-2 px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
                >
                  Return to start
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingEnd(true)}
                  className="border border-vm-border-2 px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-red hover:text-vm-red"
                >
                  End session
                </button>
              </div>
            )}
            <p className="text-[11px] leading-[1.7] text-vm-dim">
              Return to start keeps the session running and offers to resume it. End session closes the sitting — the
              nearest thing to signing out, since there is no account to sign out of. Neither touches your records.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] leading-[1.8] text-vm-dim">
              No session running. Your collection of {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} is
              still here — a session is only needed to vault something new.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="self-start border border-vm-border-2 px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
            >
              Begin a session
            </button>
          </div>
        )}
      </Section>

      <Section
        title="Collection"
        note="Records live in this browser and are kept between sessions. A backup is the only way to move them to another browser or device — or to get them back after clearing site data."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="border border-vm-gold-2 bg-vm-gold-bg px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
          >
            ↑ Restore a backup
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void restoreBackup(file);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] leading-[1.6] text-vm-dim">
            The .json file from the library&apos;s Backup button. Records you already hold are left as they are.
          </span>
        </div>

        {importError && (
          <p className="text-[11px] leading-[1.7] text-vm-red" role="alert">
            {importError}
          </p>
        )}

        {pieces.length > 0 &&
          (confirmingErase ? (
            <div className="border border-vm-red p-3">
              <p className="mb-2.5 text-[13px] leading-[1.8] text-vm-mid">
                Erases all {pieces.length} {pieces.length === 1 ? "record" : "records"} from this browser. Keys you
                have not downloaded cannot be recovered, and Vaultmark holds no copy. Export a backup first if there
                is any doubt.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearCollection();
                    setConfirmingErase(false);
                    showToast("Collection erased");
                    router.push("/");
                  }}
                  className="border border-vm-red px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-red transition-colors hover:bg-[rgba(138,58,58,0.2)]"
                >
                  Erase {pieces.length} {pieces.length === 1 ? "record" : "records"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingErase(false)}
                  className="border border-vm-border-2 px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
                >
                  Keep them
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingErase(true)}
              className="self-start border border-vm-border-2 px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-red hover:text-vm-red"
            >
              Erase collection
            </button>
          ))}
      </Section>

      <Section title="Introduction">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const cleared = resetOnboarding();
              showToast(cleared ? "Introduction will show at the start" : "This browser is not storing preferences");
              if (cleared) router.push("/");
            }}
            className="border border-vm-border-2 px-3 py-2 font-vm-mono text-[13px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
          >
            Replay the introduction
          </button>
          <span className="text-[11px] leading-[1.6] text-vm-dim">
            The four screens explaining how vaulting, keys, and storage work.
          </span>
        </div>
      </Section>

      <Section title="Correcting a sealed record">
        <p className="text-[13px] leading-[1.9] text-vm-mid">
          A sealed record is never rewritten in place. Open a piece in the library and choose{" "}
          <span className="text-vm-ink">Amend record</span> to correct a description: the field takes the new value, and
          the old value, the date, and your stated reason are kept on the record and printed on the certificate.
        </p>
        <p className="text-[13px] leading-[1.9] text-vm-mid">
          The key is never reissued. Vault ID, image fingerprint, pixel hash, QR symbol, and capture source were
          computed over the artwork itself and cannot be amended — a corrected record still verifies against exactly the
          image it was sealed for. That is why the label step pushes for a complete record before the seal.
        </p>
      </Section>

      <Section title="Not built yet">
        <p className="text-[13px] leading-[1.9] text-vm-mid">
          Account tiers, email notifications, and session history all assume accounts and a server, which this build
          does not have — every record lives in this browser. They are deliberately absent rather than shown as
          non-functional controls.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border border-vm-border bg-vm-surface p-4">
      <h2 className="text-[11px] uppercase tracking-[0.14em] text-vm-dim">{title}</h2>
      {note && <p className="mt-1 text-[11px] leading-[1.7] text-vm-dim">{note}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] uppercase tracking-[0.1em] text-vm-dim">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-vm-border bg-vm-bg px-2.5 py-2 font-vm-mono text-[14px] text-vm-ink outline-none transition-colors placeholder:text-vm-dim focus:border-vm-gold-2"
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-vm-panel px-3 py-2">
      <dt className="mb-0.5 text-[10px] uppercase tracking-[0.1em] text-vm-dim">{label}</dt>
      <dd className="text-[13px] text-vm-ink">{value}</dd>
    </div>
  );
}
