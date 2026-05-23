import { Router, type Request, type Response } from "express";
import multer from "multer";
import { join, extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import { extractTextFromFile } from "../services/ocrService";
import { extractDocumentFields } from "../services/geminiService";
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
      const ocrResult = await extractTextFromFile(req.file.path);

      if (!ocrResult.success) {
        await prisma.documentUpload.update({
          where: { id: uploadRecord.id },
          data: { status: "ocr_failed" },
        });
        return res.status(422).json({
          uploadId: uploadRecord.id,
          status: "ocr_failed",
          message: ocrResult.error,
        });
      }

      const extractedFields = await extractDocumentFields(ocrResult.text, documentType);
      const validation = validateDocument(extractedFields, userProfile);

      const updated = await prisma.documentUpload.update({
        where: { id: uploadRecord.id },
        data: {
          status: validation.status,
          confidenceScore: validation.confidenceScore,
          extractedFields: extractedFields as object,
          errors: validation.errors as object[],
          warnings: validation.warnings as object[],
          ocrTextPreview: ocrResult.text.substring(0, 300),
        },
      });

      return res.json({
        uploadId: updated.id,
        documentType,
        schemeId,
        status: validation.status,
        confidenceScore: validation.confidenceScore,
        extractedFields,
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
