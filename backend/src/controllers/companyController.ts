import { Request, Response } from "express";
import { prisma } from "../config/db";
import { User } from "@prisma/client";

interface AuthRequest<P = any> extends Request<P> {
  user?: Omit<User, "password">;
}

interface GetCompanyParams {
  companyId: string;
}

export const getCompany = async (
  req: AuthRequest<GetCompanyParams>,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: true
      }
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Optional: Verify user belongs to this company (security!)
    if (user.companyId !== companyId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
};
