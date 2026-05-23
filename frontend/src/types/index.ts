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

export interface Scheme {
  id: string;
  name: string;
  fullName: string;
  description: string;
  benefitAmount: number;
  benefitType: "cash" | "subsidy" | "insurance" | "loan" | "service";
  ministry: string;
  requiredDocuments: string[];
  applicationUrl: string;
  category: string;
}

export interface EligibilityResult {
  matchedSchemes: Scheme[];
  totalMatched: number;
  requiredDocuments: string[];
  profileSummary: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface DocumentUploadResult {
  uploadId: string;
  documentType: string;
  schemeId: string;
  status: "pass" | "fail" | "ocr_failed";
  confidenceScore: number;
  extractedFields: Record<string, string | number | null>;
  errors: ValidationError[];
  warnings: ValidationError[];
  ocrTextPreview: string | null;
}

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "document_verified"
  | "approved"
  | "disbursed";

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  changedAt: string;
  note: string;
}

export interface Application {
  id: string;
  schemeId: string;
  schemeName: string;
  schemeCategory: string;
  userName: string;
  submittedAt: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryEntry[];
  documents: string[];
  notes: string | null;
}
