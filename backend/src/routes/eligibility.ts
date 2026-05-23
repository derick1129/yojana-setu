import { Router, type Request, type Response } from "express";
import { runEligibilityCheck, type UserProfile } from "../services/eligibilityEngine";

export const eligibilityRouter = Router();

eligibilityRouter.post("/eligibility", (req: Request, res: Response) => {
  try {
    const profile: UserProfile = req.body;

    if (!profile.name || !profile.age || !profile.occupation) {
      return res.status(400).json({ error: "Missing required profile fields" });
    }

    const result = runEligibilityCheck(profile);
    return res.json(result);
  } catch (err) {
    console.error("Eligibility check error:", err);
    return res.status(500).json({ error: "Failed to check eligibility" });
  }
});
