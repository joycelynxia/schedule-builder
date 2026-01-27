import { Router } from "express";
import { getUsers, updateEmail, updatePassword } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/:companyId", getUsers);
router.put("/email", requireAuth, updateEmail);
router.put("/password", requireAuth, updatePassword);

export default router;