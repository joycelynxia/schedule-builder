import { Request, Response } from "express";
import { prisma } from "../config/db";
import { User } from "../generated/prisma";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

// Helper to convert day names to numbers (Sun=0, Mon=1, ..., Sat=6)
const dayNameToNumber = (dayName: string): number => {
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return dayMap[dayName] ?? -1;
};

// Helper to convert day numbers to names
const dayNumberToName = (dayNum: number): string => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[dayNum] ?? "";
};

// Helper to format rule for frontend (nested structure)
const formatRuleForFrontend = (rule: any) => {
  return {
    id: rule.id,
    userId: rule.userId,
    startDate: rule.startDate.toISOString().split("T")[0],
    endDate: rule.endDate.toISOString().split("T")[0],
    recurrence: rule.frequency
      ? {
          frequency: rule.frequency,
          interval: rule.interval ?? 1,
          ...(rule.frequency === "weekly" && rule.daysOfWeek?.length > 0 && {
            daysOfWeek: rule.daysOfWeek.map(dayNumberToName).filter(Boolean),
          }),
        }
      : undefined,
    timeRange:
      rule.startTime && rule.endTime
        ? { startTime: rule.startTime, endTime: rule.endTime }
        : undefined,
    allDay: rule.allDay ?? false,
  };
};

export const createUnavailabilityRule = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { startDate, endDate, recurrence, timeRange, allDay } = req.body;

    // ---- Basic required validation ----
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate are required",
      });
    }

    // ---- Logical validation ----
    if (allDay && timeRange) {
      return res.status(400).json({
        error: "allDay rules cannot have a timeRange",
      });
    }

    if (!allDay && !timeRange) {
      return res.status(400).json({
        error: "Non-allDay rules must have a timeRange",
      });
    }

    if (!allDay && timeRange) {
      if (!timeRange.startTime || !timeRange.endTime) {
        return res.status(400).json({
          error: "timeRange must include startTime and endTime",
        });
      }
    }

    if (recurrence?.frequency === "weekly" && !recurrence.daysOfWeek?.length) {
      return res.status(400).json({
        error: "Weekly recurrence requires daysOfWeek",
      });
    }

    // Convert day names to numbers for storage
    const daysOfWeekNumbers =
      recurrence?.frequency === "weekly" && recurrence.daysOfWeek
        ? recurrence.daysOfWeek
            .map(dayNameToNumber)
            .filter((num: number) => num >= 0)
        : [];

    if (
      recurrence?.frequency === "weekly" &&
      recurrence.daysOfWeek?.length > 0 &&
      daysOfWeekNumbers.length === 0
    ) {
      return res.status(400).json({
        error: "Invalid daysOfWeek values",
      });
    }

    // ---- Flatten for Prisma ----
    const rule = await prisma.unavailabilityRule.create({
      data: {
        userId: user.id,

        startDate: new Date(startDate),
        endDate: new Date(endDate),

        frequency: recurrence?.frequency,
        interval: recurrence?.interval ?? 1,
        daysOfWeek: daysOfWeekNumbers,

        startTime: allDay ? null : timeRange?.startTime,
        endTime: allDay ? null : timeRange?.endTime,

        allDay: allDay ?? false,
      },
    });

    return res.status(201).json(formatRuleForFrontend(rule));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to create unavailability rule",
    });
  }
};

export const getAllUnavailabilityRules = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Managers can see all rules, employees only see their own
    const whereClause = user.isManager ? {} : { userId: user.id };

    const rules = await prisma.unavailabilityRule.findMany({
      where: whereClause,
      orderBy: {
        startDate: "asc",
      },
    });

    const formatted = rules.map(formatRuleForFrontend);
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch unavailability rules" });
  }
};

export const getUnavailabilityRulesByUserId = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = req.params;
    const userIdString = Array.isArray(userId) ? userId[0] : userId;
    if (!userIdString) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Only managers can view other users' rules, or users can view their own
    if (!user.isManager && userIdString !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const rules = await prisma.unavailabilityRule.findMany({
      where: { userId: userIdString },
      orderBy: {
        startDate: "asc",
      },
    });

    const formatted = rules.map(formatRuleForFrontend);
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch unavailability rules" });
  }
};

export const updateUnavailabilityRule = async (
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
      return res.status(400).json({ error: "Rule ID is required" });
    }

    const { startDate, endDate, recurrence, timeRange, allDay } = req.body;

    // Check if rule exists and user owns it (or is manager)
    const existingRule = await prisma.unavailabilityRule.findUnique({
      where: { id: idString },
    });

    if (!existingRule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    if (!user.isManager && existingRule.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Validation (same as create)
    if (allDay && timeRange) {
      return res.status(400).json({
        error: "allDay rules cannot have a timeRange",
      });
    }

    if (!allDay && !timeRange) {
      return res.status(400).json({
        error: "Non-allDay rules must have a timeRange",
      });
    }

    if (!allDay && timeRange) {
      if (!timeRange.startTime || !timeRange.endTime) {
        return res.status(400).json({
          error: "timeRange must include startTime and endTime",
        });
      }
    }

    if (recurrence?.frequency === "weekly" && !recurrence.daysOfWeek?.length) {
      return res.status(400).json({
        error: "Weekly recurrence requires daysOfWeek",
      });
    }

    // Convert day names to numbers
    const daysOfWeekNumbers =
      recurrence?.frequency === "weekly" && recurrence.daysOfWeek
        ? recurrence.daysOfWeek
            .map(dayNameToNumber)
            .filter((num: number) => num >= 0)
        : [];

    if (
      recurrence?.frequency === "weekly" &&
      recurrence.daysOfWeek?.length > 0 &&
      daysOfWeekNumbers.length === 0
    ) {
      return res.status(400).json({
        error: "Invalid daysOfWeek values",
      });
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (recurrence !== undefined) {
      updateData.frequency = recurrence?.frequency ?? null;
      updateData.interval = recurrence?.interval ?? null;
      updateData.daysOfWeek = daysOfWeekNumbers;
    }
    if (allDay !== undefined) {
      updateData.allDay = allDay;
      if (allDay) {
        updateData.startTime = null;
        updateData.endTime = null;
      } else if (timeRange) {
        updateData.startTime = timeRange.startTime;
        updateData.endTime = timeRange.endTime;
      }
    } else if (timeRange !== undefined) {
      updateData.startTime = timeRange.startTime;
      updateData.endTime = timeRange.endTime;
    }

    const updatedRule = await prisma.unavailabilityRule.update({
      where: { id: idString },
      data: updateData,
    });

    return res.json(formatRuleForFrontend(updatedRule));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to update unavailability rule",
    });
  }
};

export const deleteUnavailabilityRule = async (
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
      return res.status(400).json({ error: "Rule ID is required" });
    }

    // Check if rule exists and user owns it (or is manager)
    const existingRule = await prisma.unavailabilityRule.findUnique({
      where: { id: idString },
    });

    if (!existingRule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    if (!user.isManager && existingRule.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.unavailabilityRule.delete({
      where: { id: idString },
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to delete unavailability rule",
    });
  }
};
