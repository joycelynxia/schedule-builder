import { Request, Response } from "express";
import { prisma } from "../config/db";
import { User, $Enums } from "@prisma/client";
import { getIO } from "../config/socket";
import { sendShiftPublishedEmail } from "../utils/email";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

// Helper to format shift for FullCalendar (frontend expects start/end as ISO strings)
const formatShiftForFrontend = (shift: any) => {
  const dateStr = shift.date.toISOString().split("T")[0];
  const start = new Date(`${dateStr}T${shift.startTime}:00`).toISOString();
  const end = new Date(`${dateStr}T${shift.endTime}:00`).toISOString();

  return {
    id: shift.id,
    title: shift.title || "",
    userId: shift.userId,
    start,
    end,
    note: shift.note,
    isPublished: shift.status === "PUBLISHED",
    extendedProps: {
      isPublished: shift.status === "PUBLISHED",
      status: shift.status,
    },
  };
};

export const createScheduledShift = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId, title, date, startTime, endTime, note, status } = req.body;

    // ---- Basic required validation ----
    if (!userId || !date || !startTime || !endTime) {
      return res.status(400).json({
        error: "userId, date, startTime, and endTime are required",
      });
    }

    // Only managers can create shifts for other users
    if (!user.isManager && userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const shift = await prisma.scheduledShift.create({
      data: {
        userId,
        title,
        date: new Date(date),
        startTime,
        endTime,
        note,
        status: (status as $Enums.ShiftStatus) || $Enums.ShiftStatus.DRAFT,
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            email: true,
            companyId: true,
          },
        },
      },
    });

    const formattedShift = formatShiftForFrontend(shift);
    
    // Emit socket event to company room
    const io = getIO();
    io.to(`company:${shift.user.companyId}`).emit("shift:created", formattedShift);

    // Send email notification if manager created shift for another user
    if (user.isManager && userId !== user.id) {
      const shiftDate = shift.date.toISOString().split("T")[0];
      const isDraft = shift.status === $Enums.ShiftStatus.DRAFT;
      
      // Send email notification (non-blocking)
      sendShiftPublishedEmail({
        userName: shift.user.userName,
        userEmail: shift.user.email,
        shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        title: shift.title || undefined,
        note: shift.note || undefined,
        isDraft,
      }).catch((error) => {
        console.error("Error sending shift creation email:", error);
      });
    }

    return res.status(201).json(formattedShift);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to create shift",
    });
  }
};

export const getAllScheduledShifts = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const whereClause = user.isManager
      ? {}
      : { status: $Enums.ShiftStatus.PUBLISHED };

    const [shifts, coverRequests] = await Promise.all([
      prisma.scheduledShift.findMany({
        where: {
          user: { companyId: user.companyId },
          ...whereClause,
        },
        orderBy: { date: "asc" },
      }),
      prisma.shiftSwapRequest.findMany({
        where: {
          status: $Enums.SwapRequestStatus.PENDING,
          requestedUserId: null,
          shift: { user: { companyId: user.companyId } },
        },
        select: { id: true, shiftId: true },
      }),
    ]);

    const coverByShiftId = new Map(coverRequests.map((r) => [r.shiftId, r]));
    const formatted = shifts.map((s) => {
      const cover = coverByShiftId.get(s.id);
      return {
        ...formatShiftForFrontend(s),
        needsCover: !!cover,
        coverRequestId: cover?.id ?? undefined,
      };
    });
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch scheduled shifts" });
  }
};

export const updateScheduledShift = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const idString = Array.isArray(id) ? id[0] : id;
    if (!idString) {
      return res.status(400).json({ error: "Shift ID is required" });
    }

    const { title, date, startTime, endTime, note, status, userId: newUserId } = req.body;

    // Check if shift exists
    const existingShift = await prisma.scheduledShift.findUnique({
      where: { id: idString },
      include: {
        user: { select: { companyId: true } },
      },
    });

    if (!existingShift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    // Only managers can update shifts, or users can update their own drafts
    if (
      !user.isManager &&
      (existingShift.userId !== user.id || existingShift.status === "PUBLISHED")
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Only managers can reassign a shift to another user
    if (newUserId !== undefined) {
      if (!user.isManager) {
        return res.status(403).json({ error: "Only managers can change the assigned user" });
      }
      const targetUser = await prisma.user.findUnique({
        where: { id: newUserId },
        select: { companyId: true },
      });
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      if (targetUser.companyId !== existingShift.user.companyId) {
        return res.status(403).json({ error: "User must be in the same company" });
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (note !== undefined) updateData.note = note;
    if (status !== undefined) updateData.status = status;
    if (newUserId !== undefined) updateData.userId = newUserId;

    const updatedShift = await prisma.scheduledShift.update({
      where: { id: idString },
      data: updateData,
      include: {
        user: {
          select: {
            companyId: true,
          },
        },
      },
    });

    const formattedShift = formatShiftForFrontend(updatedShift);
    
    // Emit socket event to company room
    const io = getIO();
    io.to(`company:${updatedShift.user.companyId}`).emit("shift:updated", formattedShift);

    return res.json(formattedShift);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to update shift",
    });
  }
};

export const deleteScheduledShift = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const idString = Array.isArray(id) ? id[0] : id;
    if (!idString) {
      return res.status(400).json({ error: "Shift ID is required" });
    }

    // Check if shift exists
    const existingShift = await prisma.scheduledShift.findUnique({
      where: { id: idString },
      include: {
        user: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!existingShift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    // Only managers can delete shifts, or users can delete their own drafts
    if (
      !user.isManager &&
      (existingShift.userId !== user.id || existingShift.status === "PUBLISHED")
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const companyId = existingShift.user.companyId;

    await prisma.scheduledShift.delete({
      where: { id: idString },
    });

    // Emit socket event to company room
    const io = getIO();
    io.to(`company:${companyId}`).emit("shift:deleted", { id: idString });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to delete shift",
    });
  }
};

export const publishDraftShifts = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.isManager) {
      return res
        .status(403)
        .json({ error: "Only managers can publish shifts" });
    }

    const { shiftIds } = req.body;

    if (!Array.isArray(shiftIds) || shiftIds.length === 0) {
      return res.status(400).json({
        error: "shiftIds array is required",
      });
    }

    // Update all draft shifts to published
    const result = await prisma.scheduledShift.updateMany({
      where: {
        id: { in: shiftIds },
        status: $Enums.ShiftStatus.DRAFT,
      },
      data: {
        status: $Enums.ShiftStatus.PUBLISHED,
      },
    });

    // Fetch updated shifts with user information for email notifications
    const updatedShifts = await prisma.scheduledShift.findMany({
      where: {
        id: { in: shiftIds },
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            email: true,
            companyId: true,
          },
        },
      },
    });

    const formatted = updatedShifts.map(formatShiftForFrontend);
    
    // Emit socket events for each published shift
    const io = getIO();
    formatted.forEach((shift) => {
      const shiftData = updatedShifts.find((s) => s.id === shift.id);
      if (shiftData) {
        io.to(`company:${shiftData.user.companyId}`).emit("shift:updated", shift);
      }
    });

    // Send email notifications to users whose shifts were published
    // Send emails in parallel for better performance
    const emailPromises = updatedShifts.map((shift) => {
      const shiftDate = shift.date.toISOString().split("T")[0];
      return sendShiftPublishedEmail({
        userName: shift.user.userName,
        userEmail: shift.user.email,
        shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        title: shift.title || undefined,
        note: shift.note || undefined,
        isDraft: false, // These are published shifts
      });
    });

    // Don't await emails - send them asynchronously so API response isn't delayed
    Promise.all(emailPromises).catch((error) => {
      console.error("Error sending email notifications:", error);
    });
    
    res.json(formatted);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to publish shifts",
    });
  }
};
