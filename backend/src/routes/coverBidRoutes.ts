import { Router } from "express";
import {
  createCoverBid,
  listCoverBids,
  approveCoverBid,
  rejectCoverBid,
} from "../controllers/coverBidController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.post("/", createCoverBid);
router.get("/", listCoverBids);
router.put("/:id/approve", approveCoverBid);
router.put("/:id/reject", rejectCoverBid);

export default router;
