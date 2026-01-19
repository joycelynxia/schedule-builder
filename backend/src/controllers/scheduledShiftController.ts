import { Request, Response } from "express";
import { prisma } from "../config/db";
import { User, $Enums } from "@prisma/client";

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

export const createScheduledShift = async (
  req: AuthRequest,
  res: Response
) => {
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
    });

    return res.status(201).json(formatShiftForFrontend(shift));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to create shift",
    });
  }
};

export const getAllScheduledShifts = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Managers see all shifts, employees only see published
    const whereClause = user.isManager ? {} : { status: $Enums.ShiftStatus.PUBLISHED };

    const shifts = await prisma.scheduledShift.findMany({
      where: whereClause,
      orderBy: {
        date: "asc",
      },
    });

    const formatted = shifts.map(formatShiftForFrontend);
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch scheduled shifts" });
  }
};

export const updateScheduledShift = async (
  req: AuthRequest,
  res: Response
) => {
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

    const { title, date, startTime, endTime, note, status } = req.body;

    // Check if shift exists
    const existingShift = await prisma.scheduledShift.findUnique({
      where: { id: idString },
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

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (note !== undefined) updateData.note = note;
    if (status !== undefined) updateData.status = status;

    const updatedShift = await prisma.scheduledShift.update({
      where: { id: idString },
      data: updateData,
    });

    return res.json(formatShiftForFrontend(updatedShift));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to update shift",
    });
  }
};

export const deleteScheduledShift = async (
  req: AuthRequest,
  res: Response
) => {
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

    await prisma.scheduledShift.delete({
      where: { id: idString },
    });

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
      return res.status(403).json({ error: "Only managers can publish shifts" });
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

    // Fetch updated shifts
    const updatedShifts = await prisma.scheduledShift.findMany({
      where: {
        id: { in: shiftIds },
      },
    });

    const formatted = updatedShifts.map(formatShiftForFrontend);
    res.json(formatted);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to publish shifts",
    });
  }
};
