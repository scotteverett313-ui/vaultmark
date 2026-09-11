import type { LabelDraft } from "@/components/IntakeContext";
import type { SessionType } from "./types";
import { formatDimensions } from "./records.ts";

export type Tier = "required" | "recommended";

export interface RecordField {
  /** The DOM id of the input, so a gap can be clicked straight to. */
  id: string;
  label: string;
  tier: Tier;
  /** Why it matters, shown beside the gap rather than in a tooltip. */
  why: string;
}

export interface Completeness {
  missing: RecordField[];
  missingRequired: RecordField[];
  missingRecommended: RecordField[];
  /** Counted over required + recommended fields that apply to this record. */
  filled: number;
  total: number;
  /** No required field is blank — the record can legally be sealed. */
  sealable: boolean;
  /** Nothing at all is blank — the record is worth sealing. */
  complete: boolean;
}

// Everything a record is expected to carry, in the order the form presents it.
// `applies` keeps conditional fields (gallery signatory, edition number) out of
// the count entirely rather than reporting them as permanently missing.
interface Check extends RecordField {
  applies: (label: LabelDraft, sessionType: SessionType) => boolean;
  present: (label: LabelDraft) => boolean;
}

const always = () => true;
const filled = (key: keyof LabelDraft) => (label: LabelDraft) => String(label[key]).trim().length > 0;

const CHECKS: Check[] = [
  {
    id: "title",
    label: "Title",
    tier: "required",
    why: "The certificate and every export are headed by it.",
    applies: always,
    present: filled("title"),
  },
  {
    id: "artist",
    label: "Artist Name",
    tier: "required",
    why: "The attestation is made in this name.",
    applies: always,
    present: filled("artist"),
  },
  {
    id: "year",
    label: "Year Created",
    tier: "recommended",
    why: "Dates a work to a period; hard to establish later.",
    applies: always,
    present: filled("year"),
  },
  {
    id: "medium",
    label: "Medium",
    tier: "recommended",
    why: "The first thing a buyer or insurer asks after the title.",
    applies: always,
    present: filled("medium"),
  },
  {
    id: "height",
    label: "Dimensions",
    tier: "recommended",
    why: "Distinguishes this work from a study or a reproduction of it.",
    applies: always,
    present: (label) => formatDimensions(label) !== "—",
  },
  {
    id: "editionNumber",
    label: "Edition Number",
    tier: "recommended",
    why: "A limited edition means little without its place in the run.",
    applies: (label) => label.editionType === "limited",
    present: filled("editionNumber"),
  },
  {
    id: "gallery",
    label: "Gallery Name",
    tier: "recommended",
    why: "A gallery session vaults on an institution's authority.",
    applies: (_label, sessionType) => sessionType === "gallery",
    present: filled("gallery"),
  },
  {
    id: "signatory",
    label: "Authorized Signatory",
    tier: "recommended",
    why: "Names the person answerable for the attestation.",
    applies: (_label, sessionType) => sessionType === "gallery",
    present: filled("signatory"),
  },
];

// Weight, provenance, valuation, and notes are deliberately absent: they are
// genuinely blank for a great deal of honest work, and flagging them on every
// record would teach people to ignore the panel.
export function recordCompleteness(label: LabelDraft, sessionType: SessionType): Completeness {
  const applicable = CHECKS.filter((check) => check.applies(label, sessionType));
  const missing = applicable
    .filter((check) => !check.present(label))
    .map(({ id, label: name, tier, why }) => ({ id, label: name, tier, why }));

  const missingRequired = missing.filter((field) => field.tier === "required");

  return {
    missing,
    missingRequired,
    missingRecommended: missing.filter((field) => field.tier === "recommended"),
    filled: applicable.length - missing.length,
    total: applicable.length,
    sealable: missingRequired.length === 0,
    complete: missing.length === 0,
  };
}
