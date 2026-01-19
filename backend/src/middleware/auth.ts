import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { verifyToken } from "../utils/auth";
import { User } from "../generated/prisma";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ message: "No token" });
    }

    const token = header.replace("Bearer ", "");
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    (req as any).user = user;
    next();
  } catch (err) {
    console.log(err);
    res.status(401).json({ message: "Invalid token" });
  }
};
