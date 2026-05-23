import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";

export const trackingRouter = Router();

const STATUS_ORDER = [
  "submitted",
  "under_review",
  "document_verified",
  "approved",
  "disbursed",
] as const;

trackingRouter.post("/applications", async (req: Request, res: Response) => {
  const { schemeId, schemeName, schemeCategory, userName, userProfile, documents } = req.body;

  try {
    const application = await prisma.application.create({
      data: {
        schemeId,
        schemeName,
        schemeCategory,
        userName,
        userProfile: userProfile as object,
        documents: documents as object[],
        status: "submitted",
        statusHistory: [
          { status: "submitted", changedAt: new Date().toISOString(), note: "Application submitted" },
        ],
      },
    });
    return res.status(201).json(application);
  } catch (err) {
    console.error("Create application error:", err);
    return res.status(500).json({ error: "Failed to create application" });
  }
});

trackingRouter.get("/applications", async (_req: Request, res: Response) => {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { submittedAt: "desc" },
    });
    return res.json(applications);
  } catch (err) {
    console.error("List applications error:", err);
    return res.status(500).json({ error: "Failed to fetch applications" });
  }
});

trackingRouter.get("/applications/:id", async (req: Request, res: Response) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
    });
    if (!application) return res.status(404).json({ error: "Application not found" });
    return res.json(application);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch application" });
  }
});

trackingRouter.patch("/applications/:id/advance", async (req: Request, res: Response) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
    });

    if (!application) return res.status(404).json({ error: "Application not found" });

    const currentIndex = STATUS_ORDER.indexOf(application.status as (typeof STATUS_ORDER)[number]);
    if (currentIndex === STATUS_ORDER.length - 1) {
      return res.status(400).json({ error: "Application is already at final status: disbursed" });
    }

    const nextStatus = STATUS_ORDER[currentIndex + 1];
    const history = application.statusHistory as Array<{ status: string; changedAt: string; note: string }>;

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        status: nextStatus,
        statusHistory: [
          ...history,
          {
            status: nextStatus,
            changedAt: new Date().toISOString(),
            note: `Status advanced to ${nextStatus.replace("_", " ")}`,
          },
        ],
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Advance status error:", err);
    return res.status(500).json({ error: "Failed to advance status" });
  }
});
