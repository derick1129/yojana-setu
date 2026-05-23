import express from "express";
import cors from "cors";
import { eligibilityRouter } from "./routes/eligibility";
import { documentsRouter } from "./routes/documents";
import { trackingRouter } from "./routes/tracking";
import { mkdir } from "fs/promises";
import { join } from "path";

const app = express();
const PORT = process.env.PORT || 8000;

await mkdir(join(process.cwd(), "uploads"), { recursive: true });

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/uploads", express.static(join(process.cwd(), "uploads")));

app.use("/api", eligibilityRouter);
app.use("/api", documentsRouter);
app.use("/api", trackingRouter);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Yojana Setu backend running on http://localhost:${PORT}`);
});
