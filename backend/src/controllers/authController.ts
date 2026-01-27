import { Request, Response } from "express";
import { prisma } from "../config/db";
import { hashPassword, comparePassword, createToken } from "../utils/auth";
import { User } from "@prisma/client";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export const register = async (req: AuthRequest, res: Response) => {
  const { userName, password, companyStr, isNewCompany } = req.body;
  const email = normalizeEmail(req.body.email);
  const hashed = await hashPassword(password);

  let company;

  if (isNewCompany) {
    // create new company
    company = await prisma.company.create({
      data: {
        name: companyStr,
      },
    });
  } else {
    company = await prisma.company.findUnique({
      where: { inviteCode: companyStr },
    });

    if (!company) {
      return res.status(400).json({ message: "Invalid invite code" });
    }
  }

  const user = await prisma.user.create({
    data: {
      userName,
      email,
      password: hashed,
      isManager: isNewCompany, // creator is manager
      companyId: company.id,
    },
  });
  console.log("register", user);

  res.json({ token: createToken(user.id) });
};

export const login = async (req: AuthRequest, res: Response) => {
  const password = req.body.password;
  const email = normalizeEmail(req.body.email);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const valid = await comparePassword(password, user.password);

  if (!valid) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  res.json({ token: createToken(user.id) });
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });

  const user = res.json({
    id: req.user.id,
    userName: req.user.userName,
    email: req.user.email,
    isManager: req.user.isManager,
    companyId: req.user.companyId
  });

  console.log(user);
  return user;
};
