import { Router } from "express";
import { getCompany } from "../controllers/companyController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/:companyId", getCompany)

export default router;