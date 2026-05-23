import type { ExtractedDocumentFields } from "./geminiService";
import type { UserProfile } from "./eligibilityEngine";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  status: "pass" | "fail";
  errors: ValidationError[];
  warnings: ValidationError[];
  confidenceScore: number;
}

function fuzzyMatch(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;

  let matches = 0;
  const shorter = aLower.length < bLower.length ? aLower : bLower;
  const longer = aLower.length < bLower.length ? bLower : aLower;

  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  return matches / longer.length;
}

function calculateConfidence(extracted: ExtractedDocumentFields): number {
  const values = Object.values(extracted);
  const filled = values.filter((v) => v !== null).length;
  return Math.min(100, Math.round((filled / values.length) * 100));
}

export function validateDocument(
  extracted: ExtractedDocumentFields,
  profile: UserProfile
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (extracted.fullName && profile.name) {
    const similarity = fuzzyMatch(extracted.fullName, profile.name);
    if (similarity < 0.6) {
      errors.push({
        field: "name",
        message: `Name mismatch: document shows "${extracted.fullName}" but your profile says "${profile.name}". Please ensure the document belongs to you.`,
        severity: "error",
      });
    }
  }

  if (extracted.annualIncome !== null && profile.annualIncome) {
    const docIncome = Number(extracted.annualIncome);
    if (docIncome > profile.annualIncome * 1.15) {
      errors.push({
        field: "annualIncome",
        message: `Income mismatch: document shows ₹${docIncome.toLocaleString("en-IN")} but you declared ₹${profile.annualIncome.toLocaleString("en-IN")}. Your declared income must match your certificate.`,
        severity: "error",
      });
    }
  }

  if (extracted.dateOfBirth && profile.age) {
    try {
      const [day, month, year] = extracted.dateOfBirth.split("/").map(Number);
      const dob = new Date(year, month - 1, day);
      const ageFromDoc = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (Math.abs(ageFromDoc - profile.age) > 2) {
        errors.push({
          field: "age",
          message: `Age mismatch: document shows age ${ageFromDoc} but your profile says ${profile.age}.`,
          severity: "error",
        });
      }
    } catch {
      warnings.push({
        field: "dateOfBirth",
        message: "Could not parse date of birth from document. Please verify manually.",
        severity: "warning",
      });
    }
  }

  if (extracted.gender && profile.gender) {
    const docGender = extracted.gender.toLowerCase();
    if (docGender !== profile.gender.toLowerCase()) {
      errors.push({
        field: "gender",
        message: `Gender mismatch: document shows "${extracted.gender}" but profile says "${profile.gender}".`,
        severity: "error",
      });
    }
  }

  const confidence = calculateConfidence(extracted);
  if (confidence < 30) {
    warnings.push({
      field: "scan_quality",
      message: "Document scan quality is low. Consider re-uploading a clearer photo in good lighting.",
      severity: "warning",
    });
  }

  return {
    status: errors.length === 0 ? "pass" : "fail",
    errors,
    warnings,
    confidenceScore: confidence,
  };
}
