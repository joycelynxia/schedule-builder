import { Request, Response } from "express";
import { prisma } from "../config/db";
import { User } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/auth";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id:true, 
      userName: true,
      // isManager: true,
    },
  });
  res.json(users)
}

export const updateEmail = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Update email
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { email },
      select: {
        id: true,
        userName: true,
        email: true,
        isManager: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update email" });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: "Current password and new password are required" 
      });
    }

    // Get the full user to access password
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const valid = await comparePassword(currentPassword, fullUser.password);
    if (!valid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update password" });
  }
};
