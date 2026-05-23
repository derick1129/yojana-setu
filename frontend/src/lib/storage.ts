import type { EligibilityResult, UserProfile } from "../types";

const PROFILE_KEY = "yojana_profile";
const ELIGIBILITY_KEY = "yojana_eligibility";

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveEligibility(result: EligibilityResult): void {
  localStorage.setItem(ELIGIBILITY_KEY, JSON.stringify(result));
}

export function getEligibility(): EligibilityResult | null {
  const raw = localStorage.getItem(ELIGIBILITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EligibilityResult;
  } catch {
    return null;
  }
}
