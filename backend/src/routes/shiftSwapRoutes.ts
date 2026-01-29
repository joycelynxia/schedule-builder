import { Router } from "express";
import {
  createSwapRequest,
  getAllSwapRequests,
  approveSwapRequest,
  rejectSwapRequest,
  agreeSwapByPartner,
  declineSwapByPartner,
} from "../controllers/shiftSwapController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/", createSwapRequest);
router.get("/", getAllSwapRequests);
router.put("/:id/approve", approveSwapRequest);
router.put("/:id/reject", rejectSwapRequest);
router.put("/:id/agree-by-partner", agreeSwapByPartner);
router.put("/:id/decline-by-partner", declineSwapByPartner);

export default router;
