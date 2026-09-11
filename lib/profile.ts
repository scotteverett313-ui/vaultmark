export const PROFILE_STORAGE_KEY = "vaultmark:profile";

export interface Profile {
  galleryName: string;
  location: string;
  signatory: string;
  artists: string[];
}

export const EMPTY_PROFILE: Profile = { galleryName: "", location: "", signatory: "", artists: [] };

export function serializeProfile(profile: Profile): string {
  return JSON.stringify(profile);
}

// Same trust-boundary treatment as the session blob: anything that does not
// match the current shape is dropped rather than handed to the label form.
export function parseStoredProfile(raw: string | null): Profile | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const { galleryName, location, signatory, artists } = parsed as Partial<Profile>;
  return {
    galleryName: typeof galleryName === "string" ? galleryName : "",
    location: typeof location === "string" ? location : "",
    signatory: typeof signatory === "string" ? signatory : "",
    artists: Array.isArray(artists) ? artists.filter((a): a is string => typeof a === "string" && a.trim() !== "") : [],
  };
}

/** The roster plus anyone already vaulted this session, deduped and sorted. */
export function mergeArtists(saved: string[], vaulted: string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of [...saved, ...vaulted]) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === "—") continue;
    if (!seen.has(trimmed.toLowerCase())) seen.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
