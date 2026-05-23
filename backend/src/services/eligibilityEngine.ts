import { schemes, type Scheme } from "../data/schemes";

export interface UserProfile {
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  state: string;
  occupation: "farmer" | "salaried" | "business" | "student" | "unemployed" | "other";
  annualIncome: number;
  casteCategory: "general" | "OBC" | "SC" | "ST";
  landOwnership: boolean;
  isBPL: boolean;
  familySize: number;
  hasGirlChild: boolean;
  girlChildAge?: number;
  isPregnant?: boolean;
}

export interface EligibilityResult {
  matchedSchemes: Scheme[];
  totalMatched: number;
  requiredDocuments: string[];
  profileSummary: string;
}

function checkScheme(profile: UserProfile, scheme: Scheme): boolean {
  const r = scheme.eligibility;

  if (r.occupation.length > 0 && !r.occupation.includes(profile.occupation)) return false;

  if (r.maxAnnualIncome !== null && profile.annualIncome > r.maxAnnualIncome) return false;

  if (r.landOwnership === true && !profile.landOwnership) return false;
  if (r.landOwnership === false && profile.landOwnership) return false;

  if (r.states.length > 0 && !r.states.includes(profile.state)) return false;

  if (r.minAge !== null && profile.age < r.minAge) return false;
  if (r.maxAge !== null && profile.age > r.maxAge) return false;

  if (r.casteCategories.length > 0 && !r.casteCategories.includes(profile.casteCategory)) return false;

  if (r.gender.length > 0 && !r.gender.includes(profile.gender)) return false;

  if (r.isBPL === true && !profile.isBPL) return false;

  if (r.hasGirlChild === true && !profile.hasGirlChild) return false;

  if (r.isPregnant === true && !profile.isPregnant) return false;

  return true;
}

export function runEligibilityCheck(profile: UserProfile): EligibilityResult {
  const matched = schemes
    .filter((s) => checkScheme(profile, s))
    .sort((a, b) => b.benefitAmount - a.benefitAmount);

  const allDocs = matched.flatMap((s) => s.requiredDocuments);
  const requiredDocuments = [...new Set(allDocs)];

  const profileSummary = `${profile.occupation.charAt(0).toUpperCase() + profile.occupation.slice(1)}, age ${profile.age}, ${profile.state}, ₹${profile.annualIncome.toLocaleString("en-IN")}/year, ${profile.casteCategory}`;

  return {
    matchedSchemes: matched,
    totalMatched: matched.length,
    requiredDocuments,
    profileSummary,
  };
}
