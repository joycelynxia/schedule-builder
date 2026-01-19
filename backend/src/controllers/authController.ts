import { Request, Response } from "express";
import { prisma } from "../config/db";
import { hashPassword, comparePassword, createToken } from "../utils/auth";
import { User } from "../generated/prisma";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

export const register = async (req: AuthRequest, res: Response) => {
  const { userName, email, password } = req.body;

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      userName,
      email,
      password: hashed,
      isManager: false,
    },
  });
  console.log("register", user)

  res.json({ token: createToken(user.id) });
};

export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

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
  if (!req.user) return res.status(401).json({message: "Not logged in"});

  const user = res.json({
    id: req.user.id,
    userName: req.user.userName,
    email: req.user.email,
    isManager: req.user.isManager,
  });

  console.log(user);
  return user;
}