import { createWorker } from "tesseract.js";
import { readFile } from "fs/promises";
import { extname } from "path";
import pdfParse from "pdf-parse";

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

const TESSERACT_LANG = "eng";
let ocrWorker: Awaited<ReturnType<typeof createWorker>> | undefined;

async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;

  ocrWorker = await createWorker(TESSERACT_LANG, undefined, {
    logger: () => undefined,
  });
  await ocrWorker.load();
  await ocrWorker.reinitialize(TESSERACT_LANG);
  return ocrWorker;
}

function normalizeText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

function getLines(text: string): string[] {
  return normalizeText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractLineValue(line: string): string | null {
  const separator = line.match(/[:\-–]/);
  if (!separator) return null;
  return line.slice(separator.index! + 1).trim() || null;
}

function extractLabelValue(lines: string[], labels: RegExp[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (labels.some((pattern) => pattern.test(line))) {
      const value = extractLineValue(line);
      if (value) return value;
      if (i + 1 < lines.length) return lines[i + 1];
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  const matches = text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})\b/);
  if (!matches?.[1]) return null;
  const parts = matches[1].replace(/\-/g, "/").replace(/\./g, "/").split("/");
  if (parts.length !== 3) return matches[1];
  const [d, m, y] = parts.map((part) => part.padStart(2, "0"));
  return `${d}/${m}/${y}`;
}

function extractAadhaarNumber(text: string): string | null {
  const normalized = text.replace(/\s+/g, "");
  const match = normalized.match(/\b(\d{12})\b/);
  return match?.[1] ?? null;
}

function extractDocumentNumber(text: string): string | null {
  const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
  if (panMatch?.[1]) return panMatch[1];

  const idMatch = text.match(/\b([A-Z0-9]{6,20})\b/);
  return idMatch?.[1] ?? null;
}

function extractGender(text: string): string | null {
  const match = text.match(/\b(male|female|other|transgender|m|f)\b/i);
  if (!match?.[1]) return null;
  const normalized = match[1].toLowerCase();
  if (normalized === "m") return "Male";
  if (normalized === "f") return "Female";
  if (normalized === "transgender") return "Other";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function extractCasteCategory(text: string): string | null {
  const match = text.match(/\b(general|obc|sc|st|ews)\b/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function extractAnnualIncome(text: string): number | null {
  const match = text.match(/(?:annual income|income(?: per year)?|yearly income|total income)[^\d\n]*([\d,]+)/i);
  if (!match?.[1]) return null;
  const cleaned = match[1].replace(/,/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function detectDocumentType(text: string): string | null {
  const normalized = text.toLowerCase();
  if (/aadhaar|uidai|unique identification/i.test(normalized)) return "Aadhaar Card";
  if (/ration card|food security|rationcard/i.test(normalized)) return "Ration Card";
  if (/pan card|permanent account number|income tax department/i.test(normalized)) return "PAN Card";
  if (/income certificate|annual income certificate/i.test(normalized)) return "Income Certificate";
  if (/bpl certificate|below poverty line/i.test(normalized)) return "BPL Certificate";
  if (/bank passbook|passbook/i.test(normalized)) return "Bank Passbook";
  if (/land record|jamabandi|khasra|fard|record of rights/i.test(normalized)) return "Land Record";
  if (/caste certificate|certificate of caste/i.test(normalized)) return "Caste Certificate";
  return null;
}

function matchesExpectedDocumentType(expected: string, detected: string | null): boolean {
  if (!detected) return false;
  const normalizedExpected = expected.toLowerCase();
  const normalizedDetected = detected.toLowerCase();
  return normalizedDetected.includes(normalizedExpected) || normalizedExpected.includes(normalizedDetected);
}

async function extractTextFromImage(filePath: string): Promise<string> {
  const worker = await getOcrWorker();
  const result = await worker.recognize(filePath);
  return (result.data?.text ?? "").toString();
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

async function extractText(filePath: string): Promise<string> {
  const mimeType = mimeFromPath(filePath);
  if (mimeType === "application/pdf") {
    const buffer = await readFile(filePath);
    return extractTextFromPdf(buffer);
  }
  return extractTextFromImage(filePath);
}

function buildExtractionResult(text: string, expectedDocumentType: string): VisionExtractionResult {
  const lines = getLines(text);
  const detectedDocumentType = detectDocumentType(text);
  const documentTypeMatches = matchesExpectedDocumentType(expectedDocumentType, detectedDocumentType);

  return {
    fullName: extractLabelValue(lines, [/\bname\b/i, /\bnaam\b/i, /applicant name/i, /beneficiary name/i]) ?? null,
    dateOfBirth: extractDate(text),
    annualIncome: extractAnnualIncome(text),
    documentNumber:
      extractDocumentNumber(text) ??
      extractLabelValue(lines, [/document\s*no/i, /doc\s*no/i, /id\s*no/i, /application\s*no/i]) ??
      null,
    issuingAuthority: extractLabelValue(lines, [/issued by/i, /authority/i, /issuing authority/i, /office of/i]) ?? null,
    dateOfIssue: extractDate(text),
    address: extractLabelValue(lines, [/address/i, /residence/i, /permanent address/i]) ?? null,
    fatherName: extractLabelValue(lines, [/father's name/i, /father name/i, /son of/i, /daughter of/i]) ?? null,
    gender: extractGender(text),
    aadhaarNumber: extractAadhaarNumber(text),
    casteCategory: extractCasteCategory(text),
    detectedDocumentType,
    documentTypeMatches,
    readable: Boolean(text.trim()),
    extractionNotes: detectedDocumentType
      ? null
      : "Document type could not be determined from text. Please upload a clearer document.",
    analysisFailed: false,
    failureReason: null,
  };
}

export async function extractDocumentFieldsFromFile(
  filePath: string,
  expectedDocumentType: string
): Promise<VisionExtractionResult> {
  const mimeType = mimeFromPath(filePath);
  if (!["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) {
    return emptyVisionResult(`Unsupported file type: ${mimeType}`);
  }

  try {
    const text = await extractText(filePath);
    if (!text.trim()) {
      return emptyVisionResult(
        "Could not read any text from the document. Upload a clearer image or PDF.",
        "api"
      );
    }

    return buildExtractionResult(text, expectedDocumentType);
  } catch (err) {
    console.error("OCR extraction failed:", err);
    return emptyVisionResult(
      "Local OCR failed while reading the document. Upload a clearer image or PDF.",
      "api"
    );
  }
}
