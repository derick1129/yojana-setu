import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

export async function extractDocumentFields(
  ocrText: string,
  documentType: string
): Promise<ExtractedDocumentFields> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a document parser for Indian government documents.

Document type: ${documentType}
Raw OCR text extracted from the document:
---
${ocrText.substring(0, 3000)}
---

Extract the following fields from the text. If a field is not found or unclear, return null.
Return ONLY valid JSON with no explanation and no markdown code fences.

{
  "fullName": "string or null",
  "dateOfBirth": "DD/MM/YYYY or null",
  "annualIncome": "number in rupees or null",
  "documentNumber": "string or null",
  "issuingAuthority": "string or null",
  "dateOfIssue": "DD/MM/YYYY or null",
  "address": "string or null",
  "fatherName": "string or null",
  "gender": "Male or Female or Other or null",
  "aadhaarNumber": "12-digit number or null (only if Aadhaar card)",
  "casteCategory": "General or OBC or SC or ST or null (only if caste certificate)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as ExtractedDocumentFields;
  } catch (err) {
    console.error("Gemini extraction failed:", err);
    return {
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
  }
}
