import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { prisma } from "./config/db"; // Add this import

// Import routes
import unavailabilityRuleRoutes from "./routes/unavailabilityRules";
import scheduledShiftRoutes from "./routes/scheduledShifts";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import companyRoutes from "./routes/companyRoutes";
import shiftSwapRoutes from "./routes/shiftSwapRoutes";
import coverBidRoutes from "./routes/coverBidRoutes";

const app = express();

// ---- Middleware ----
app.use(cors()); // allow cross-origin requests (adjust for production)
app.use(express.json()); // parse JSON bodies

// ---- Routes ----
app.use("/api/unavailabilityRules", unavailabilityRuleRoutes);
app.use("/api/shifts", scheduledShiftRoutes);
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/swap-requests", shiftSwapRoutes);
app.use("/api/cover-bids", coverBidRoutes);

// ---- Health check ----
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "Backend is running!" });
});

// ---- Database connection test ----
app.get("/api/db-test", async (req: Request, res: Response) => {
  try {
    await prisma.$connect();
    res.json({
      status: "OK",
      message: "Database connected successfully!",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ---- 404 Handler ----
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// ---- Error Handler ----
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
