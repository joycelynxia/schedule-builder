import { Router } from "express";
import {
  createUnavailabilityRule,
  getAllUnavailabilityRules,
  getUnavailabilityRulesByUserId,
  updateUnavailabilityRule,
  deleteUnavailabilityRule,
} from "../controllers/unavailabilityRuleController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.post("/", createUnavailabilityRule);
router.get("/", getAllUnavailabilityRules);
router.get("/user/:userId", getUnavailabilityRulesByUserId);
router.put("/:id", updateUnavailabilityRule);
router.delete("/:id", deleteUnavailabilityRule);

export default router;
