export const ONBOARDING_STORAGE_KEY = "vaultmark:onboarded";

/**
 * Bump only when the introduction says something a returning user genuinely
 * needs to see again. Raising it re-shows the flow for everyone.
 */
export const ONBOARDING_VERSION = 1;

export interface OnboardingState {
  completedVersion: number;
  /**
   * Set by the Replay button in Settings. A never-seen marker and a replay
   * request would otherwise be indistinguishable, and the rule that spares
   * existing users the introduction would swallow the request.
   */
  replayRequested?: boolean;
}

export interface OnboardingStep {
  id: string;
  eyebrow: string;
  title: string;
  /** Paragraphs, in order. Kept as data so the copy is testable. */
  body: string[];
  /** The one thing this step wants understood, set apart from the prose. */
  note?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "what",
    eyebrow: "What this is",
    title: "Vaultmark seals an artwork to a key",
    body: [
      "A photograph of the work is fingerprinted, then a region of its pixels is masked by a QR pattern and hashed. The result is a key credential — a short file that belongs to one image and no other.",
      "The artwork is never uploaded. Everything happens in this browser.",
    ],
    note: "Authentication is the image and the key together. Neither proves anything alone.",
  },
  {
    id: "intake",
    eyebrow: "Vaulting a piece",
    title: "Five steps, then the key is issued",
    body: [
      "Capture the work, vault it to generate the pixel key, label it with the details that belong on the certificate, confirm and attest, and the key is issued.",
      "Take your time on the label. Once a record is sealed it is not rewritten — a later correction is appended as a dated amendment that stays on the certificate.",
    ],
    note: "The label step will tell you what is still blank before you seal.",
  },
  {
    id: "key",
    eyebrow: "The key",
    title: "You hold it, and only you",
    body: [
      "Download the .vmk file when it is issued and keep it with the work. It travels to a buyer the way a certificate does.",
      "Vaultmark keeps no copy of it, which means a lost key cannot be reissued by anyone — including us.",
    ],
    note: "Anyone can check an image against a key on the Verify page. No account, no sign-in.",
  },
  {
    id: "storage",
    eyebrow: "Where records live",
    title: "In this browser, and kept between sessions",
    body: [
      "Your collection stays here on this device. Ending a session or starting a new one leaves it alone.",
      "Clearing site data removes it, and there is no server holding a copy. The Backup export from the library is the only way to move your records to another device or get them back.",
    ],
    note: "Back up once you have vaulted something you would not want to redo.",
  },
];

export function serializeOnboarding(state: OnboardingState): string {
  return JSON.stringify(state);
}

// Same trust-boundary treatment as every other stored blob: unreadable means
// not yet seen, which shows the introduction rather than hiding it wrongly.
export function parseStoredOnboarding(raw: string | null): OnboardingState | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const { completedVersion, replayRequested } = parsed as Partial<OnboardingState>;
  if (typeof completedVersion !== "number" || !Number.isFinite(completedVersion)) return null;

  return { completedVersion, replayRequested: replayRequested === true };
}

export function hasCompletedOnboarding(raw: string | null, version = ONBOARDING_VERSION): boolean {
  const state = parseStoredOnboarding(raw);
  return state !== null && state.completedVersion >= version;
}

/** Someone asked for the introduction back, however much they have vaulted. */
export function isReplayRequested(raw: string | null): boolean {
  return parseStoredOnboarding(raw)?.replayRequested === true;
}

/** What Settings stores to put the introduction back on the next visit. */
export const REPLAY_REQUEST: OnboardingState = { completedVersion: 0, replayRequested: true };
