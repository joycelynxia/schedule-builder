import { Router } from "express";
import {
  createScheduledShift,
  getAllScheduledShifts,
  updateScheduledShift,
  deleteScheduledShift,
  publishDraftShifts,
} from "../controllers/scheduledShiftController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.post("/", createScheduledShift);
router.get("/", getAllScheduledShifts);
router.put("/:id", updateScheduledShift);
router.delete("/:id", deleteScheduledShift);
router.post("/publish", publishDraftShifts);

export default router;
