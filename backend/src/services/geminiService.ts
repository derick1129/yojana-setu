import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "fs/promises";
import { extname } from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/** Free-tier friendly default; override with GEMINI_MODEL in .env */
const DEFAULT_MODEL = "gemini-1.5-flash";

const FALLBACK_MODELS = (
  process.env.GEMINI_MODEL_FALLBACKS ?? "gemini-1.5-flash"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

function modelsToTry(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  return [...new Set([primary, ...FALLBACK_MODELS])];
}

export interface ExtractedDocumentFields {
  fullName: string | null;
  dateOfBirth: string | null;
  annualIncome: number | null;
  documentNumber: string | null;
  issuingAuthority: string | null;
  dateOfIssue: string | null;
  address: string | null;
  fatherName: string | null;
  gender: string | null;
  aadhaarNumber: string | null;
  casteCategory: string | null;
}

export type VisionFailureReason = "quota" | "config" | "api" | null;

export interface VisionExtractionResult extends ExtractedDocumentFields {
  detectedDocumentType: string | null;
  documentTypeMatches: boolean;
  readable: boolean;
  extractionNotes: string | null;
  analysisFailed: boolean;
  failureReason: VisionFailureReason;
}

const EMPTY_FIELDS: ExtractedDocumentFields = {
  fullName: null,
  dateOfBirth: null,
  annualIncome: null,
  documentNumber: null,
  issuingAuthority: null,
  dateOfIssue: null,
  address: null,
  fatherName: null,
  gender: null,
  aadhaarNumber: null,
  casteCategory: null,
};

function emptyVisionResult(
  notes: string,
  failureReason: VisionFailureReason = "api",
  analysisFailed = true
): VisionExtractionResult {
  return {
    ...EMPTY_FIELDS,
    detectedDocumentType: null,
    documentTypeMatches: false,
    readable: false,
    extractionNotes: notes,
    analysisFailed,
    failureReason,
  };
}

function mimeFromPath(filePath: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
  };
  return map[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function buildVisionPrompt(expectedDocumentType: string): string {
  return `You are verifying Indian government documents for a welfare scheme application.

The applicant MUST upload this document type for this slot: "${expectedDocumentType}"

Examine the attached image or PDF carefully (read text and layout visually).

Tasks:
1. Identify what document this actually is (e.g. Aadhaar Card, Ration Card, PAN Card, Income Certificate, BPL Certificate, Bank Passbook, Land Record, Caste Certificate, etc.).
2. Set "documentTypeMatches" to true ONLY if this file is the correct document for the slot "${expectedDocumentType}".
   - Example: ration card uploaded for "Aadhaar Card" slot → documentTypeMatches: false
   - "Bank passbook" slot with a passbook → true
3. Set "readable" to false if blank, corrupted, too blurry, or not a document.
4. Extract visible fields. Use null when not visible.

Return ONLY valid JSON (no markdown fences):
{
  "detectedDocumentType": "string — what you see",
  "documentTypeMatches": true or false (boolean, not string),
  "readable": true or false (boolean, not string),
  "extractionNotes": "string or null — explain mismatch/unreadable",
  "fullName": "string or null",
  "dateOfBirth": "DD/MM/YYYY or null",
  "annualIncome": number or null,
  "documentNumber": "string or null",
  "issuingAuthority": "string or null",
  "dateOfIssue": "DD/MM/YYYY or null",
  "address": "string or null",
  "fatherName": "string or null",
  "gender": "Male or Female or Other or null",
  "aadhaarNumber": "12-digit string or null",
  "casteCategory": "General or OBC or SC or ST or null"
}`;
}
function extractJsonPayload(raw: string): string {
  const withoutFences = raw.replace(/```(?:json)?/gi, "").trim();
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return withoutFences;
  }
  return withoutFences.slice(firstBrace, lastBrace + 1);
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "").trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const cleaned = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(cleaned)) return true;
    if (["false", "no", "0"].includes(cleaned)) return false;
  }
  return fallback;
}

function parseVisionJson(raw: string): VisionExtractionResult {
  const payload = extractJsonPayload(raw);
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(payload);
  } catch {
    throw new Error("Gemini returned non-JSON output.");
  }

  if (!parsedUnknown || typeof parsedUnknown !== "object" || Array.isArray(parsedUnknown)) {
    throw new Error("Gemini returned invalid JSON shape.");
  }
  const parsed = parsedUnknown as Record<string, unknown>;

  return {
    fullName: asNullableString(parsed.fullName),
    dateOfBirth: asNullableString(parsed.dateOfBirth),
    annualIncome: asNullableNumber(parsed.annualIncome),
    documentNumber: asNullableString(parsed.documentNumber),
    issuingAuthority: asNullableString(parsed.issuingAuthority),
    dateOfIssue: asNullableString(parsed.dateOfIssue),
    address: asNullableString(parsed.address),
    fatherName: asNullableString(parsed.fatherName),
    gender: asNullableString(parsed.gender),
    aadhaarNumber: asNullableString(parsed.aadhaarNumber),
    casteCategory: asNullableString(parsed.casteCategory),
    detectedDocumentType: asNullableString(parsed.detectedDocumentType),
    documentTypeMatches: asBoolean(parsed.documentTypeMatches, false),
    readable: asBoolean(parsed.readable, true),
    extractionNotes: asNullableString(parsed.extractionNotes),
    analysisFailed: false,
    failureReason: null,
  };
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|quota|Too Many Requests|RESOURCE_EXHAUSTED/i.test(msg);
}
function isConfigError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /API[_\s-]?key.*(invalid|missing)|PERMISSION_DENIED|UNAUTHENTICATED|authentication|forbidden/i.test(
    msg
  );
}

function isModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /models\/.*(not found|is not found)|unknown model|unsupported model|invalid model|for API version/i.test(
    msg
  );
}

function conciseErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const cleaned = raw
    .replace(/^\[GoogleGenerativeAI Error\]:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= 220) return cleaned;
  const firstSentence = cleaned.split(". ")[0]?.trim();
  if (firstSentence && firstSentence.length > 20 && firstSentence.length <= 220) {
    return firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
  }
  return "Could not analyze document with AI vision.";
}

function friendlyApiError(err: unknown): { message: string; failureReason: VisionFailureReason } {
  if (isQuotaError(err)) {
    return {
      failureReason: "quota",
      message:
        "Gemini API free-tier quota exceeded. Wait about 1 minute and try again. In backend/.env set GEMINI_MODEL=gemini-1.5-flash (recommended for free tier).",
    };
  }
  if (isConfigError(err)) {
    return {
      failureReason: "config",
      message:
        "Gemini authentication failed. Check GEMINI_API_KEY and ensure Gemini API access is enabled for the key.",
    };
  }
  if (isModelError(err)) {
    return {
      failureReason: "api",
      message:
        "Configured Gemini model is unavailable for this API key/version. Use GEMINI_MODEL=gemini-1.5-flash or set GEMINI_MODEL_FALLBACKS with valid models.",
    };
  }
  return {
    failureReason: "api",
    message: conciseErrorMessage(err),
  };
}

async function callVisionModel(
  modelName: string,
  mimeType: string,
  base64: string,
  expectedDocumentType: string
): Promise<VisionExtractionResult> {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    { text: buildVisionPrompt(expectedDocumentType) },
  ]);

  const text = result.response.text().trim();
  if (!text) {
    return emptyVisionResult("Gemini returned an empty response.");
  }

  return parseVisionJson(text);
}

/** Primary extraction: send file bytes to Gemini Vision (images + PDF). */
export async function extractDocumentFieldsFromFile(
  filePath: string,
  expectedDocumentType: string
): Promise<VisionExtractionResult> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return emptyVisionResult(
      "GEMINI_API_KEY is not configured on the server.",
      "config"
    );
  }

  const mimeType = mimeFromPath(filePath);
  if (!["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) {
    return emptyVisionResult(`Unsupported file type: ${mimeType}`);
  }

  const buffer = await readFile(filePath);
  const base64 = buffer.toString("base64");
  const models = modelsToTry();
  const failures: Array<{ modelName: string; message: string; failureReason: VisionFailureReason }> = [];

  for (const modelName of models) {
    try {
      console.log(`Gemini vision: trying model ${modelName}`);
      return await callVisionModel(modelName, mimeType, base64, expectedDocumentType);
    } catch (err) {
      console.error(`Gemini vision failed (${modelName}):`, err);
      const { message, failureReason } = friendlyApiError(err);
      failures.push({ modelName, message, failureReason });
      if (failureReason === "config") {
        return emptyVisionResult(message, failureReason);
      }
      continue;
    }
  }

  const quotaFailure = failures.find((f) => f.failureReason === "quota");
  if (quotaFailure) {
    return emptyVisionResult(quotaFailure.message, "quota");
  }

  const modelFailure = failures.find((f) => /model/i.test(f.message));
  if (modelFailure) {
    return emptyVisionResult(modelFailure.message, "api");
  }

  const lastFailure = failures.at(-1);
  return emptyVisionResult(
    lastFailure?.message ?? "Could not analyze document with AI vision.",
    lastFailure?.failureReason ?? "api"
  );
}
