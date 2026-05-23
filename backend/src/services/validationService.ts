import type { ExtractedDocumentFields, VisionExtractionResult } from "./geminiService";
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

type FieldKey = keyof ExtractedDocumentFields;

const GENERIC_QUALITY_KEYS: readonly FieldKey[] = [
  "fullName",
  "documentNumber",
  "issuingAuthority",
  "dateOfIssue",
  "address",
];

const SLOT_QUALITY_KEYS: Record<string, readonly FieldKey[]> = {
  "Aadhaar Card": ["fullName", "dateOfBirth", "aadhaarNumber", "address", "gender"],
  "Ration card": ["fullName", "address", "documentNumber"],
  "Income certificate": ["fullName", "annualIncome", "issuingAuthority", "dateOfIssue"],
  "BPL certificate": ["fullName", "documentNumber", "issuingAuthority"],
  "Bank passbook": ["fullName", "documentNumber", "address"],
  "PAN card": ["fullName", "documentNumber", "dateOfBirth"],
  "Caste certificate": ["fullName", "casteCategory", "issuingAuthority", "dateOfIssue"],
  "Land ownership documents": ["fullName", "documentNumber", "address"],
  "Khasra/Khatauni": ["fullName", "documentNumber", "address"],
  "Address proof": ["fullName", "address", "documentNumber"],
  "Business proof": ["fullName", "documentNumber", "issuingAuthority"],
  "Business plan": ["documentNumber", "dateOfIssue", "issuingAuthority"],
  "Job card (MNREGA)": ["fullName", "documentNumber", "address"],
  "School enrolment proof": ["fullName", "documentNumber", "dateOfIssue"],
  "Previous marksheet": ["fullName", "dateOfIssue", "issuingAuthority"],
  "Girl child birth certificate": ["fullName", "dateOfBirth", "dateOfIssue"],
  "Parent/guardian ID proof": ["fullName", "documentNumber", "address"],
  "MCP card (Mother & Child Protection)": ["fullName", "documentNumber", "dateOfIssue"],
  "Pregnancy proof": ["fullName", "documentNumber", "dateOfIssue"],
  "Passport-size photo": [],
  "Mobile number linked to Aadhaar": ["aadhaarNumber", "fullName"],
};

const SLOT_REQUIRES_FULL_NAME = new Set<string>([
  "Aadhaar Card",
  "Ration card",
  "Income certificate",
  "BPL certificate",
  "Bank passbook",
  "PAN card",
  "Caste certificate",
  "Land ownership documents",
  "Khasra/Khatauni",
  "Address proof",
  "Business proof",
  "Job card (MNREGA)",
  "School enrolment proof",
  "Previous marksheet",
  "Girl child birth certificate",
  "Parent/guardian ID proof",
  "MCP card (Mother & Child Protection)",
  "Pregnancy proof",
]);

/** Slot-specific signals when vision metadata is uncertain. */
const SLOT_HINTS: Record<string, { keywords: RegExp; requireAadhaar?: boolean }> = {
  "Aadhaar Card": {
    keywords: /aadhaar|aadhar|uidai|unique identification/i,
    requireAadhaar: true,
  },
  "Ration card": { keywords: /ration|pds|food\s*&\s*supplies|nfsa/i },
  "Income certificate": { keywords: /income|annual income|tehsildar|revenue/i },
  "BPL certificate": { keywords: /bpl|below poverty|antyodaya/i },
  "Bank passbook": { keywords: /passbook|account|ifsc|savings|bank/i },
  "PAN card": { keywords: /permanent account|income tax|pan\b/i },
  "Caste certificate": { keywords: /caste|scheduled caste|scheduled tribe|obc/i },
  "Land ownership documents": { keywords: /land|khasra|khatauni|7\/12|property/i },
  "Khasra/Khatauni": { keywords: /khasra|khatauni|land record/i },
  "Address proof": {
    keywords: /address|residence|domicile|utility bill|voter id|driving licence|passport/i,
  },
  "Business proof": {
    keywords: /udyam|trade license|shop and establishment|gst|business registration/i,
  },
  "Business plan": { keywords: /business plan|project report|proposal|cash flow/i },
  "Job card (MNREGA)": { keywords: /job card|mnrega|nrega/i },
  "School enrolment proof": { keywords: /school|enrolment|admission|student/i },
  "Previous marksheet": { keywords: /marksheet|mark sheet|grade|result/i },
  "Girl child birth certificate": { keywords: /birth certificate|registrar of births|date of birth/i },
  "Parent/guardian ID proof": { keywords: /parent|guardian|id proof|aadhaar|pan|passport/i },
  "MCP card (Mother & Child Protection)": {
    keywords: /mcp|mother and child protection|antenatal|maternal/i,
  },
  "Pregnancy proof": { keywords: /pregnan|maternity|antenatal|ultrasound/i },
  "Passport-size photo": { keywords: /passport size|photo|photograph/i },
  "Mobile number linked to Aadhaar": { keywords: /aadhaar|uidai|mobile|otp/i, requireAadhaar: true },
};

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

function getQualityKeys(expectedDocumentType: string): readonly FieldKey[] {
  return SLOT_QUALITY_KEYS[expectedDocumentType] ?? GENERIC_QUALITY_KEYS;
}

function countFilledFields(extracted: VisionExtractionResult, keys: readonly FieldKey[]): number {
  return keys.filter((k) => extracted[k] != null && extracted[k] !== "").length;
}

function calculateConfidence(
  extracted: VisionExtractionResult,
  expectedDocumentType: string
): number {
  const keys = getQualityKeys(expectedDocumentType);
  if (keys.length === 0) {
    let score = 100;
    if (!extracted.readable) score = Math.min(score, 15);
    if (!extracted.documentTypeMatches) score = Math.min(score, 25);
    return score;
  }
  const filled = countFilledFields(extracted, keys);
  let score = Math.round((filled / keys.length) * 100);
  if (!extracted.readable) score = Math.min(score, 15);
  if (!extracted.documentTypeMatches) score = Math.min(score, 25);
  return Math.min(100, score);
}

function normalizeDocLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function labelsRoughlyMatch(expected: string, detected: string | null): boolean {
  if (!detected) return false;
  const a = normalizeDocLabel(expected);
  const b = normalizeDocLabel(detected);
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const slot = SLOT_HINTS[expected];
  if (slot?.keywords.test(detected)) return true;
  return false;
}

export function validateDocument(
  extracted: VisionExtractionResult,
  profile: UserProfile,
  expectedDocumentType: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (extracted.analysisFailed) {
    const message =
      extracted.failureReason === "quota"
        ? (extracted.extractionNotes ??
          "Gemini API quota exceeded. Wait a minute, then retry. Use GEMINI_MODEL=gemini-1.5-flash in backend/.env.")
        : (extracted.extractionNotes ??
          "AI could not analyze this document. Check GEMINI_API_KEY and try again.");

    return {
      status: "fail",
      errors: [{ field: "analysis", message, severity: "error" }],
      warnings: [],
      confidenceScore: 0,
    };
  }

  if (!extracted.readable) {
    errors.push({
      field: "readable",
      message:
        extracted.extractionNotes ??
        "Document is not readable. Upload a clearer photo in good lighting.",
      severity: "error",
    });
  }

  if (!extracted.documentTypeMatches) {
    const detected = extracted.detectedDocumentType ?? "unknown document";
    errors.push({
      field: "documentType",
      message: `Wrong document: this slot requires "${expectedDocumentType}" but the file looks like "${detected}". ${extracted.extractionNotes ?? ""}`.trim(),
      severity: "error",
    });
  } else if (
    extracted.detectedDocumentType &&
    !labelsRoughlyMatch(expectedDocumentType, extracted.detectedDocumentType)
  ) {
    errors.push({
      field: "documentType",
      message: `Document type mismatch: expected "${expectedDocumentType}", detected "${extracted.detectedDocumentType}".`,
      severity: "error",
    });
  }

  const slotRule = SLOT_HINTS[expectedDocumentType];
  if (slotRule?.requireAadhaar && !extracted.aadhaarNumber) {
    errors.push({
      field: "aadhaarNumber",
      message: "Aadhaar number not found on this document. Upload a valid Aadhaar card.",
      severity: "error",
    });
  }

  if (
    extracted.readable &&
    SLOT_REQUIRES_FULL_NAME.has(expectedDocumentType) &&
    !extracted.fullName
  ) {
    errors.push({
      field: "fullName",
      message: "Could not read the name on this document. Upload a clearer copy.",
      severity: "error",
    });
  }

  if (extracted.fullName && profile.name) {
    const similarity = fuzzyMatch(extracted.fullName, profile.name);
    if (similarity < 0.6) {
      errors.push({
        field: "name",
        message: `Name mismatch: document shows "${extracted.fullName}" but your profile says "${profile.name}".`,
        severity: "error",
      });
    }
  }

  if (extracted.annualIncome !== null && profile.annualIncome) {
    const docIncome = Number(extracted.annualIncome);
    if (docIncome > profile.annualIncome * 1.15) {
      errors.push({
        field: "annualIncome",
        message: `Income mismatch: document shows ₹${docIncome.toLocaleString("en-IN")} but you declared ₹${profile.annualIncome.toLocaleString("en-IN")}.`,
        severity: "error",
      });
    }
  }

  if (extracted.dateOfBirth && profile.age) {
    try {
      const [day, month, year] = extracted.dateOfBirth.split("/").map(Number);
      const dob = new Date(year, month - 1, day);
      const ageFromDoc = Math.floor(
        (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
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
        message: "Could not parse date of birth from document.",
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

  const confidence = calculateConfidence(extracted, expectedDocumentType);
  const qualityKeys = getQualityKeys(expectedDocumentType);
  const filledQualitySignals = countFilledFields(extracted, qualityKeys);
  if (qualityKeys.length > 0 && extracted.readable && filledQualitySignals === 0) {
    errors.push({
      field: "scan_quality",
      message:
        "Document is visible but no key details could be extracted. Re-upload a clearer, complete image.",
      severity: "error",
    });
  } else if (confidence < 40) {
    warnings.push({
      field: "scan_quality",
      message: "Document looks low quality. Consider re-uploading a sharper, complete photo.",
      severity: "warning",
    });
  } else if (confidence < 60) {
    warnings.push({
      field: "scan_quality",
      message: "Some fields were unclear. Consider re-uploading a sharper photo.",
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
