import { Request, Response } from "express";
import { prisma } from "../config/db";
import { User, $Enums } from "@prisma/client";
import { getIO } from "../config/socket";
import { sendCoverSwapApprovedEmail } from "../utils/email";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

// Create a swap/cover request
export const createSwapRequest = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { shiftId, requestedUserId, reason } = req.body;

    if (!shiftId) {
      return res.status(400).json({ error: "shiftId is required" });
    }

    // Verify shift exists and belongs to user's company
    const shift = await prisma.scheduledShift.findUnique({
      where: { id: shiftId },
      include: {
        user: {
          select: {
            companyId: true,
            id: true,
          },
        },
      },
    });

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    // Verify shift belongs to user's company
    if (shift.user.companyId !== user.companyId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // If requestedUserId is provided, verify it exists and is in same company
    if (requestedUserId) {
      const requestedUser = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { companyId: true },
      });

      if (!requestedUser) {
        return res.status(404).json({ error: "Requested user not found" });
      }

      if (requestedUser.companyId !== user.companyId) {
        return res.status(403).json({ error: "Requested user must be in same company" });
      }
    }

    // Check if there's already a pending request for this shift
    const existingRequest = await prisma.shiftSwapRequest.findFirst({
      where: {
        shiftId,
        status: $Enums.SwapRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      return res.status(400).json({ error: "A pending swap request already exists for this shift" });
    }

    // Create the swap request
    const swapRequest = await prisma.shiftSwapRequest.create({
      data: {
        shiftId,
        requesterId: user.id,
        requestedUserId: requestedUserId || null,
        reason: reason || null,
        status: $Enums.SwapRequestStatus.PENDING,
      },
      include: {
        shift: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                email: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
        requestedUser: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
      },
    });

    // Emit socket event to company room
    const io = getIO();
    io.to(`company:${user.companyId}`).emit("swapRequest:created", swapRequest);

    return res.status(201).json(swapRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create swap request" });
  }
};

// Get all swap requests (filtered by company)
export const getAllSwapRequests = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status, type } = req.query;

    const whereClause: any = {
      shift: {
        user: {
          companyId: user.companyId,
        },
      },
    };

    if (status && typeof status === "string") {
      whereClause.status = status as $Enums.SwapRequestStatus;
    }

    // type=cover: PENDING cover requests (no requestedUserId) – all company users can list (available shifts)
    if (type === "cover") {
      whereClause.requestedUserId = null;
      whereClause.status = $Enums.SwapRequestStatus.PENDING;
    } else if (!user.isManager) {
      // Non-managers see own requests as requester, or swap requests where they're the requested user
      whereClause.OR = [
        { requesterId: user.id },
        { requestedUserId: user.id },
      ];
    }

    const swapRequests = await prisma.shiftSwapRequest.findMany({
      where: whereClause,
      include: {
        shift: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                email: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
        requestedUser: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(swapRequests);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch swap requests" });
  }
};

// Agree to swap (requested user only) – must be called before manager can approve
export const agreeSwapByPartner = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: "Swap request ID is required" });

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: {
        shift: { include: { user: { select: { companyId: true } } } },
        requester: { select: { id: true, userName: true, email: true } },
        requestedUser: { select: { id: true, userName: true, email: true } },
      },
    });

    if (!swapRequest) return res.status(404).json({ error: "Swap request not found" });
    if (swapRequest.shift.user.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
    if (swapRequest.requestedUserId !== user.id) return res.status(403).json({ error: "Only the requested swap partner can agree" });
    if (swapRequest.status !== $Enums.SwapRequestStatus.PENDING) return res.status(400).json({ error: "Swap request is not pending" });
    if (swapRequest.requestedUserApprovedAt) return res.status(400).json({ error: "You have already agreed" });

    const companyId = swapRequest.shift.user.companyId;
    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: { requestedUserApprovedAt: new Date() },
      include: {
        shift: { include: { user: { select: { companyId: true, id: true, userName: true, email: true } } } },
        requester: { select: { id: true, userName: true, email: true } },
        requestedUser: { select: { id: true, userName: true, email: true } },
      },
    });

    const io = getIO();
    io.to(`company:${companyId}`).emit("swapRequest:partnerAgreed", updated);

    // Manager agreeing = auto-approve: process swap immediately (no separate approval step)
    if (user.isManager) {
      await prisma.shiftSwapRequest.update({
        where: { id },
        data: { status: $Enums.SwapRequestStatus.APPROVED },
      });
      await prisma.scheduledShift.update({
        where: { id: updated.shiftId },
        data: {
          userId: updated.requestedUserId!,
          title: updated.requestedUser!.userName,
        },
      });

      const approved = await prisma.shiftSwapRequest.findUnique({
        where: { id },
        include: {
          shift: { include: { user: { select: { companyId: true } } } },
          requester: { select: { id: true, userName: true, email: true } },
          requestedUser: { select: { id: true, userName: true, email: true } },
        },
      });
      if (approved) {
        io.to(`company:${companyId}`).emit("swapRequest:approved", approved);
        const updatedShift = await prisma.scheduledShift.findUnique({
          where: { id: approved.shiftId },
          include: { user: { select: { companyId: true } } },
        });
        if (updatedShift) {
          const dateStr = updatedShift.date.toISOString().split("T")[0];
          const start = new Date(`${dateStr}T${updatedShift.startTime}:00`).toISOString();
          const end = new Date(`${dateStr}T${updatedShift.endTime}:00`).toISOString();
          io.to(`company:${companyId}`).emit("shift:updated", {
            id: updatedShift.id,
            title: updatedShift.title || "",
            userId: updatedShift.userId,
            start,
            end,
            note: updatedShift.note,
            isPublished: updatedShift.status === "PUBLISHED",
            extendedProps: { isPublished: updatedShift.status === "PUBLISHED", status: updatedShift.status },
          });
          const reqUser = approved.requester;
          const reqdUser = approved.requestedUser;
          if (reqUser?.userName && reqUser?.email && reqdUser?.userName && reqdUser?.email) {
            sendCoverSwapApprovedEmail({
              userName: reqUser.userName,
              userEmail: reqUser.email,
              type: "swap",
              role: "requester",
              shiftDate: dateStr,
              startTime: updatedShift.startTime,
              endTime: updatedShift.endTime,
              note: updatedShift.note,
              otherPartyName: reqdUser.userName,
            }).catch(() => {});
            sendCoverSwapApprovedEmail({
              userName: reqdUser.userName,
              userEmail: reqdUser.email,
              type: "swap",
              role: "assignee",
              shiftDate: dateStr,
              startTime: updatedShift.startTime,
              endTime: updatedShift.endTime,
              note: updatedShift.note,
              otherPartyName: reqUser.userName,
            }).catch(() => {});
          }
        }
        return res.json(approved);
      }
    }

    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to agree to swap" });
  }
};

// Reject swap (requested user only)
export const declineSwapByPartner = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: "Swap request ID is required" });

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: { shift: { include: { user: { select: { companyId: true } } } } },
    });

    if (!swapRequest) return res.status(404).json({ error: "Swap request not found" });
    if (swapRequest.shift.user.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
    if (swapRequest.requestedUserId !== user.id) return res.status(403).json({ error: "Only the requested swap partner can decline" });
    if (swapRequest.status !== $Enums.SwapRequestStatus.PENDING) return res.status(400).json({ error: "Swap request is not pending" });

    const companyId = swapRequest.shift.user.companyId;
    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: $Enums.SwapRequestStatus.REJECTED },
      include: {
        shift: { include: { user: { select: { companyId: true } } } },
        requester: { select: { id: true, userName: true, email: true } },
        requestedUser: { select: { id: true, userName: true, email: true } },
      },
    });

    const io = getIO();
    io.to(`company:${companyId}`).emit("swapRequest:partnerDeclined", updated);
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to decline swap" });
  }
};

// Approve a swap request (manager only). For swaps, partner must have agreed first. Cover requests are approved via cover bids.
export const approveSwapRequest = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!user.isManager) return res.status(403).json({ error: "Only managers can approve swap requests" });

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: "Swap request ID is required" });

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: {
        shift: { include: { user: { select: { companyId: true } } } },
      },
    });

    if (!swapRequest) return res.status(404).json({ error: "Swap request not found" });
    if (swapRequest.shift.user.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
    if (swapRequest.status !== $Enums.SwapRequestStatus.PENDING) return res.status(400).json({ error: "Swap request is not pending" });

    // Cover requests: approve via cover bid, not here
    if (!swapRequest.requestedUserId) {
      return res.status(400).json({ error: "Approve a cover bid to assign this shift. Cover requests cannot be approved directly." });
    }

    // Swap: requested user must have agreed first
    if (!swapRequest.requestedUserApprovedAt) {
      return res.status(400).json({ error: "The swap partner must agree before you can approve." });
    }

    const updatedRequest = await prisma.shiftSwapRequest.update({
      where: { id },
      data: {
        status: $Enums.SwapRequestStatus.APPROVED,
      },
      include: {
        shift: {
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
        },
        requester: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
        requestedUser: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
      },
    });

    // Swap: transfer shift to requested user and update title to new assignee's name
    await prisma.scheduledShift.update({
      where: { id: updatedRequest.shiftId },
      data: {
        userId: updatedRequest.requestedUserId!,
        title: updatedRequest.requestedUser!.userName,
      },
    });

    const io = getIO();
    io.to(`company:${updatedRequest.shift.user.companyId}`).emit("swapRequest:approved", updatedRequest);

    const updatedShift = await prisma.scheduledShift.findUnique({
      where: { id: updatedRequest.shiftId },
      include: { user: { select: { companyId: true } } },
    });
    if (updatedShift) {
      const dateStr = updatedShift.date.toISOString().split("T")[0];
      const start = new Date(`${dateStr}T${updatedShift.startTime}:00`).toISOString();
      const end = new Date(`${dateStr}T${updatedShift.endTime}:00`).toISOString();
      io.to(`company:${updatedRequest.shift.user.companyId}`).emit("shift:updated", {
        id: updatedShift.id,
        title: updatedShift.title || "",
        userId: updatedShift.userId,
        start,
        end,
        note: updatedShift.note,
        isPublished: updatedShift.status === "PUBLISHED",
        extendedProps: { isPublished: updatedShift.status === "PUBLISHED", status: updatedShift.status },
      });
      const reqUser = updatedRequest.requester;
      const reqdUser = updatedRequest.requestedUser;
      if (reqUser?.userName && reqUser?.email && reqdUser?.userName && reqdUser?.email) {
        sendCoverSwapApprovedEmail({
          userName: reqUser.userName,
          userEmail: reqUser.email,
          type: "swap",
          role: "requester",
          shiftDate: dateStr,
          startTime: updatedShift.startTime,
          endTime: updatedShift.endTime,
          note: updatedShift.note,
          otherPartyName: reqdUser.userName,
        }).catch(() => {});
        sendCoverSwapApprovedEmail({
          userName: reqdUser.userName,
          userEmail: reqdUser.email,
          type: "swap",
          role: "assignee",
          shiftDate: dateStr,
          startTime: updatedShift.startTime,
          endTime: updatedShift.endTime,
          note: updatedShift.note,
          otherPartyName: reqUser.userName,
        }).catch(() => {});
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to approve swap request" });
  }
};

// Reject a swap request (manager only)
export const rejectSwapRequest = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.isManager) {
      return res.status(403).json({ error: "Only managers can reject swap requests" });
    }

    const { id } = req.params;
    const idString = Array.isArray(id) ? id[0] : id;
    if (!idString) {
      return res.status(400).json({ error: "Swap request ID is required" });
    }

    // Find the swap request
    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: idString },
      include: {
        shift: {
          include: {
            user: {
              select: {
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!swapRequest) {
      return res.status(404).json({ error: "Swap request not found" });
    }

    // Verify it belongs to user's company
    if (swapRequest.shift.user.companyId !== user.companyId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Verify it's still pending
    if (swapRequest.status !== $Enums.SwapRequestStatus.PENDING) {
      return res.status(400).json({ error: "Swap request is not pending" });
    }

    // Update the swap request status
    const updatedRequest = await prisma.shiftSwapRequest.update({
      where: { id: idString },
      data: {
        status: $Enums.SwapRequestStatus.REJECTED,
      },
      include: {
        shift: {
          include: {
            user: {
              select: {
                companyId: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
        requestedUser: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
      },
    });

    // Emit socket event to company room
    const io = getIO();
    io.to(`company:${updatedRequest.shift.user.companyId}`).emit("swapRequest:rejected", updatedRequest);

    return res.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to reject swap request" });
  }
};
