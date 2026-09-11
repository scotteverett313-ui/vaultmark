"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EMPTY_PROFILE, PROFILE_STORAGE_KEY, parseStoredProfile, serializeProfile, type Profile } from "@/lib/profile";

interface ProfileContextValue {
  profile: Profile;
  restored: boolean;
  updateProfile: (patch: Partial<Profile>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

// Outlives any one session: a gallery's own details and roster should not have
// to be retyped for every intake day.
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const stored = parseStoredProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY));
      if (stored) setProfile(stored);
    } catch {
      // No stored profile is a perfectly normal starting state.
    }
    setRestored(true);
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(PROFILE_STORAGE_KEY, serializeProfile(next));
      } catch {
        // Best effort; the in-memory profile still works for this session.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ profile, restored, updateProfile }), [profile, restored, updateProfile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
