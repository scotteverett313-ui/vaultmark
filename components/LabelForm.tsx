"use client";

import { useToast } from "@/components/Toast";
import type { LabelDraft } from "@/components/IntakeContext";
import type { SessionType } from "@/lib/types";
import { EDITION_LABELS, EDITION_TYPES } from "@/lib/records";

const MEDIUM_SUGGESTIONS = [
  "Oil on canvas",
  "Oil on linen",
  "Acrylic on canvas",
  "Acrylic and graphite on canvas",
  "Watercolor on paper",
  "Charcoal on paper",
  "Mixed media on board",
  "Encaustic on panel",
  "Archival inkjet print",
  "Gelatin silver print",
  "Screenprint on paper",
  "Digital illustration",
  "Bronze",
];


export interface VaultRecordRow {
  label: string;
  value: string;
  copyable?: boolean;
}

export interface LabelFormProps {
  value: LabelDraft;
  onChange: (patch: Partial<LabelDraft>) => void;
  sessionType: SessionType;
  vaultRecord: VaultRecordRow[];
  errors: Partial<Record<keyof LabelDraft, string>>;
}

export default function LabelForm({ value, onChange, sessionType, vaultRecord, errors }: LabelFormProps) {
  const { showToast } = useToast();

  function copy(text: string, what: string) {
    navigator.clipboard.writeText(text);
    showToast(`${what} copied to clipboard`);
  }

  return (
    <div className="grid gap-4 p-5 md:grid-cols-2 lg:p-6">
      <SectionLabel>Artwork Identification</SectionLabel>

      <Field
        className="md:col-span-2"
        id="title"
        label="Title"
        required
        error={errors.title}
        value={value.title}
        onChange={(v) => onChange({ title: v })}
        placeholder="e.g. Untitled No. 3 / The Blue Period Series"
      />
      <Field
        id="artist"
        label="Artist Name"
        required
        error={errors.artist}
        value={value.artist}
        onChange={(v) => onChange({ artist: v })}
        placeholder="Full legal name"
      />
      <Field
        id="year"
        label="Year Created"
        value={value.year}
        onChange={(v) => onChange({ year: v })}
        placeholder="e.g. 2024"
      />
      <Field
        className="md:col-span-2"
        id="medium"
        label="Medium"
        list="vm-mediums"
        value={value.medium}
        onChange={(v) => onChange({ medium: v })}
        placeholder="e.g. Oil on canvas / Archival inkjet print"
        hint="Start typing for common mediums, or enter your own."
      />
      <datalist id="vm-mediums">
        {MEDIUM_SUGGESTIONS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <SectionLabel>Physical Details</SectionLabel>

      <div className="md:col-span-2">
        <div className="mb-1.5 flex items-center gap-3">
          <span className="text-[9px] uppercase tracking-[0.1em] text-vm-dim">Dimensions</span>
          <div className="flex gap-px bg-vm-border" role="group" aria-label="Dimension unit">
            {(["in", "cm"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onChange({ unit })}
                aria-pressed={value.unit === unit}
                className={`px-2.5 py-1 font-vm-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
                  value.unit === unit ? "bg-vm-gold-bg text-vm-gold" : "bg-vm-surface text-vm-dim hover:text-vm-mid"
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <BareInput
            id="height"
            aria-label={`Height in ${value.unit}`}
            value={value.height}
            onChange={(v) => onChange({ height: v })}
            placeholder={`H (${value.unit})`}
          />
          <BareInput
            id="width"
            aria-label={`Width in ${value.unit}`}
            value={value.width}
            onChange={(v) => onChange({ width: v })}
            placeholder={`W (${value.unit})`}
          />
          <BareInput
            id="depth"
            aria-label={`Depth in ${value.unit}`}
            value={value.depth}
            onChange={(v) => onChange({ depth: v })}
            placeholder={`D (${value.unit})`}
          />
        </div>
      </div>

      <Field
        id="weight"
        label="Weight"
        value={value.weight}
        onChange={(v) => onChange({ weight: v })}
        placeholder="e.g. 4 lbs / 1.8 kg (optional)"
      />

      <SectionLabel>Edition &amp; Provenance</SectionLabel>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="editionType" className="text-[9px] uppercase tracking-[0.1em] text-vm-dim">
          Edition
        </label>
        <select
          id="editionType"
          value={value.editionType}
          onChange={(e) => onChange({ editionType: e.target.value as LabelDraft["editionType"] })}
          className="w-full cursor-pointer border border-vm-border bg-vm-surface px-2.5 py-2 font-vm-mono text-[11px] text-vm-ink outline-none transition-colors focus:border-vm-gold-2"
        >
          {EDITION_TYPES.map((type) => (
            <option key={type} value={type}>
              {EDITION_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {value.editionType === "limited" && (
        <Field
          id="editionNumber"
          label="Edition Number"
          value={value.editionNumber}
          onChange={(v) => onChange({ editionNumber: v })}
          placeholder="e.g. 2 of 5"
        />
      )}

      <Field
        className="md:col-span-2"
        id="provenance"
        label="Provenance"
        multiline
        value={value.provenance}
        onChange={(v) => onChange({ provenance: v })}
        placeholder="Ownership history. e.g. Acquired directly from artist, 2024. Previously exhibited at [Gallery], 2023."
        hint="Brief chain of ownership. Leave blank if not yet exhibited or sold."
      />

      {sessionType === "gallery" && (
        <>
          <SectionLabel>Gallery / Institution</SectionLabel>
          <Field
            id="gallery"
            label="Gallery Name"
            value={value.gallery}
            onChange={(v) => onChange({ gallery: v })}
            placeholder="Representing institution"
          />
          <Field
            id="signatory"
            label="Authorized Signatory"
            value={value.signatory}
            onChange={(v) => onChange({ signatory: v })}
            placeholder="Name + title of gallery representative"
          />
        </>
      )}

      <SectionLabel>Valuation</SectionLabel>

      <Field
        id="value"
        label="Appraised Value"
        value={value.value}
        onChange={(v) => onChange({ value: v })}
        placeholder="e.g. $12,500 USD"
      />
      <Field
        id="appraiser"
        label="Appraiser"
        value={value.appraiser}
        onChange={(v) => onChange({ appraiser: v })}
        placeholder="Name + credentials"
      />
      <Field
        className="md:col-span-2"
        id="notes"
        label="Additional Notes"
        multiline
        value={value.notes}
        onChange={(v) => onChange({ notes: v })}
        placeholder="Condition notes, exhibition history, awards, etc."
      />

      <SectionLabel>Vault Record — auto-generated</SectionLabel>

      <dl className="grid grid-cols-1 gap-px bg-vm-border md:col-span-2 md:grid-cols-2">
        {vaultRecord.map((row) => (
          <div key={row.label} className="flex items-start gap-2 bg-vm-gold-bg px-2.5 py-2">
            <div className="min-w-0 flex-1">
              <dt className="mb-1 text-[8px] uppercase tracking-[0.1em] text-vm-dim">{row.label}</dt>
              <dd className="break-all text-[10px] leading-[1.6] text-vm-gold">{row.value}</dd>
            </div>
            {row.copyable && (
              <button
                type="button"
                onClick={() => copy(row.value, row.label)}
                className="mt-2 flex-shrink-0 border border-vm-gold-2 px-1.5 py-0.5 font-vm-mono text-[8px] uppercase tracking-[0.1em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
              >
                Copy
              </button>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 border-b border-vm-border pb-2 text-[9px] uppercase tracking-[0.15em] text-vm-dim md:col-span-2">
      {children}
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  list?: string;
  className?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  multiline,
  list,
  className,
}: FieldProps) {
  const base = `w-full border bg-vm-surface px-2.5 py-2 font-vm-mono text-[11px] text-vm-ink outline-none transition-colors placeholder:text-vm-dim ${
    error ? "border-vm-red" : "border-vm-border focus:border-vm-gold-2"
  }`;

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-vm-dim">
        {label}
        {required && <span className="text-[10px] text-vm-gold">✦</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          aria-invalid={Boolean(error)}
          className={`${base} min-h-[72px] resize-y`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          list={list}
          aria-invalid={Boolean(error)}
          className={base}
        />
      )}
      {error ? (
        <span className="text-[9px] text-vm-red">{error}</span>
      ) : hint ? (
        <span className="text-[9px] leading-[1.6] text-vm-dim">{hint}</span>
      ) : null}
    </div>
  );
}

function BareInput({
  id,
  value,
  onChange,
  placeholder,
  ...rest
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-vm-border bg-vm-surface px-2.5 py-2 font-vm-mono text-[11px] text-vm-ink outline-none transition-colors placeholder:text-vm-dim focus:border-vm-gold-2"
      {...rest}
    />
  );
}
