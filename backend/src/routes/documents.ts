import { Router, type Request, type Response } from "express";
import multer from "multer";
import { join, extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import { extractDocumentFieldsFromFile } from "../services/geminiService";
import { validateDocument } from "../services/validationService";
import type { UserProfile } from "../services/eligibilityEngine";

export const documentsRouter = Router();

const storage = multer.diskStorage({
  destination: join(process.cwd(), "uploads"),
  filename: (_, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    if (allowed.includes(extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
    }
  },
});

documentsRouter.post(
  "/documents/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { schemeId, documentType, userProfile: userProfileRaw } = req.body;

    if (!schemeId || !documentType || !userProfileRaw) {
      return res.status(400).json({ error: "schemeId, documentType, and userProfile are required" });
    }

    let userProfile: UserProfile;
    try {
      userProfile = JSON.parse(userProfileRaw);
    } catch {
      return res.status(400).json({ error: "Invalid userProfile JSON" });
    }

    const uploadRecord = await prisma.documentUpload.create({
      data: {
        schemeId,
        documentType,
        originalName: req.file.originalname,
        filePath: req.file.path,
        status: "processing",
      },
    });

    try {
      const extracted = await extractDocumentFieldsFromFile(req.file.path, documentType);
      const validation = validateDocument(extracted, userProfile, documentType);
      const finalStatus: "pass" | "fail" | "ocr_failed" =
        extracted.analysisFailed ? "fail" : !extracted.readable ? "ocr_failed" : validation.status;

      const previewText = [
        extracted.detectedDocumentType && `Detected: ${extracted.detectedDocumentType}`,
        extracted.extractionNotes,
        extracted.fullName && `Name: ${extracted.fullName}`,
      ]
        .filter(Boolean)
        .join(" · ")
        .substring(0, 300);

      const updated = await prisma.documentUpload.update({
        where: { id: uploadRecord.id },
        data: {
          status: finalStatus,
          confidenceScore: validation.confidenceScore,
          extractedFields: extracted as object,
          errors: validation.errors as object[],
          warnings: validation.warnings as object[],
          ocrTextPreview: previewText || null,
        },
      });

      return res.json({
        uploadId: updated.id,
        documentType,
        schemeId,
        status: finalStatus,
        confidenceScore: validation.confidenceScore,
        extractedFields: extracted,
        errors: validation.errors,
        warnings: validation.warnings,
        ocrTextPreview: updated.ocrTextPreview,
      });
    } catch (err) {
      console.error("Document processing error:", err);
      await prisma.documentUpload.update({
        where: { id: uploadRecord.id },
        data: { status: "fail" },
      });
      return res.status(500).json({ error: "Document processing failed" });
    }
  }
);
