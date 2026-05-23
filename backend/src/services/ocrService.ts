import Tesseract from "tesseract.js";

export interface OCRResult {
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export async function extractTextFromFile(filePath: string): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(filePath, "eng+hin", {
      logger: () => {},
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      success: true,
    };
  } catch (err) {
    console.error("OCR failed:", err);
    return {
      text: "",
      confidence: 0,
      success: false,
      error: "Could not read document. Please upload a clearer photo in good lighting.",
    };
  }
}
