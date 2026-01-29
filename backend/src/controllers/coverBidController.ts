import { Request, Response } from "express";
import { prisma } from "../config/db";
import { User, $Enums } from "@prisma/client";
import { getIO } from "../config/socket";

interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

// Create a cover bid (user requests to cover a shift)
export const createCoverBid = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { coverRequestId } = req.body;
    if (!coverRequestId) return res.status(400).json({ error: "coverRequestId is required" });

    const coverRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: coverRequestId },
      include: {
        shift: { include: { user: { select: { companyId: true } } } },
        requester: { select: { id: true } },
      },
    });

    if (!coverRequest) return res.status(404).json({ error: "Cover request not found" });
    if (coverRequest.requestedUserId != null) return res.status(400).json({ error: "Not a cover request" });
    if (coverRequest.status !== $Enums.SwapRequestStatus.PENDING) return res.status(400).json({ error: "Cover request is not pending" });
    if (coverRequest.shift.user.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
    if (coverRequest.requesterId === user.id) return res.status(400).json({ error: "You cannot cover your own shift" });

    const existing = await prisma.coverBid.findFirst({
      where: { coverRequestId, bidderId: user.id, status: $Enums.CoverBidStatus.PENDING },
    });
    if (existing) return res.status(400).json({ error: "You already have a pending bid for this shift" });

    const bid = await prisma.coverBid.create({
      data: { coverRequestId, bidderId: user.id, status: $Enums.CoverBidStatus.PENDING },
      include: {
        coverRequest: {
          include: {
            shift: { include: { user: { select: { companyId: true, id: true, userName: true, email: true } } } },
            requester: { select: { id: true, userName: true, email: true } },
          },
        },
        bidder: { select: { id: true, userName: true, email: true } },
      },
    });

    const io = getIO();

    // Manager requesting to cover = auto-approve: process immediately (no separate approval step)
    if (user.isManager) {
      await prisma.$transaction(async (tx) => {
        await tx.coverBid.updateMany({
          where: {
            coverRequestId: bid.coverRequestId,
            id: { not: bid.id },
            status: $Enums.CoverBidStatus.PENDING,
          },
          data: { status: $Enums.CoverBidStatus.REJECTED },
        });
        await tx.coverBid.update({ where: { id: bid.id }, data: { status: $Enums.CoverBidStatus.APPROVED } });
        await tx.shiftSwapRequest.update({
          where: { id: bid.coverRequestId },
          data: { status: $Enums.SwapRequestStatus.APPROVED },
        });
        await tx.scheduledShift.update({
          where: { id: bid.coverRequest.shiftId },
          data: { userId: bid.bidderId, title: bid.bidder.userName },
        });
      });

      const updated = await prisma.coverBid.findUnique({
        where: { id: bid.id },
        include: {
          coverRequest: {
            include: {
              shift: { include: { user: { select: { companyId: true } } } },
              requester: { select: { id: true, userName: true, email: true } },
            },
          },
          bidder: { select: { id: true, userName: true, email: true } },
        },
      });
      if (updated) {
        io.to(`company:${user.companyId}`).emit("coverBid:approved", updated);
        const shift = await prisma.scheduledShift.findUnique({
          where: { id: bid.coverRequest.shiftId },
          include: { user: { select: { companyId: true } } },
        });
        if (shift) {
          const dateStr = shift.date.toISOString().split("T")[0];
          const start = new Date(`${dateStr}T${shift.startTime}:00`).toISOString();
          const end = new Date(`${dateStr}T${shift.endTime}:00`).toISOString();
          io.to(`company:${shift.user.companyId}`).emit("shift:updated", {
            id: shift.id,
            title: shift.title || "",
            userId: shift.userId,
            start,
            end,
            note: shift.note,
            isPublished: shift.status === "PUBLISHED",
            extendedProps: { isPublished: shift.status === "PUBLISHED", status: shift.status },
          });
        }
        return res.status(201).json(updated);
      }
    }

    io.to(`company:${user.companyId}`).emit("coverBid:created", bid);
    return res.status(201).json(bid);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to create cover bid" });
  }
};

// List cover bids (by coverRequestId, or all for company if manager)
export const listCoverBids = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { coverRequestId } = req.query;

    if (coverRequestId && typeof coverRequestId === "string") {
      const coverRequest = await prisma.shiftSwapRequest.findUnique({
        where: { id: coverRequestId },
        include: { shift: { include: { user: { select: { companyId: true } } } } },
      });
      if (!coverRequest) return res.status(404).json({ error: "Cover request not found" });
      if (coverRequest.shift.user.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });

      const bids = await prisma.coverBid.findMany({
        where: { coverRequestId },
        include: {
          coverRequest: {
            include: {
              shift: { include: { user: { select: { id: true, userName: true, email: true } } } },
              requester: { select: { id: true, userName: true, email: true } },
            },
          },
          bidder: { select: { id: true, userName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      return res.json(bids);
    }

    // List all bids for user's company (manager) or user's bids
    const where: any = {
      coverRequest: {
        shift: { user: { companyId: user.companyId } },
      },
    };
    if (!user.isManager) where.bidderId = user.id;

    const bids = await prisma.coverBid.findMany({
      where,
      include: {
        coverRequest: {
          include: {
            shift: { include: { user: { select: { id: true, userName: true, email: true } } } },
            requester: { select: { id: true, userName: true, email: true } },
          },
        },
        bidder: { select: { id: true, userName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(bids);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list cover bids" });
  }
};

// Approve a cover bid (manager only) – reassign shift to bidder, mark cover request approved, reject other bids
export const approveCoverBid = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!user.isManager) return res.status(403).json({ error: "Only managers can approve cover bids" });

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: "Bid ID is required" });

    const bid = await prisma.coverBid.findUnique({
      where: { id },
      include: {
        coverRequest: {
          include: {
            shift: { include: { user: { select: { companyId: true } } } },
          },
        },
        bidder: { select: { id: true, userName: true, email: true } },
      },
    });

    if (!bid) return res.status(404).json({ error: "Cover bid not found" });
    if (bid.coverRequest.shift.user.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
    if (bid.status !== $Enums.CoverBidStatus.PENDING) return res.status(400).json({ error: "Bid is not pending" });

    await prisma.$transaction(async (tx) => {
      await tx.coverBid.updateMany({
        where: {
          coverRequestId: bid.coverRequestId,
          id: { not: id },
          status: $Enums.CoverBidStatus.PENDING,
        },
        data: { status: $Enums.CoverBidStatus.REJECTED },
      });
      await tx.coverBid.update({ where: { id }, data: { status: $Enums.CoverBidStatus.APPROVED } });
      await tx.shiftSwapRequest.update({
        where: { id: bid.coverRequestId },
        data: { status: $Enums.SwapRequestStatus.APPROVED },
      });
      await tx.scheduledShift.update({
        where: { id: bid.coverRequest.shiftId },
        data: { userId: bid.bidderId, title: bid.bidder.userName },
      });
    });

    const updated = await prisma.coverBid.findUnique({
      where: { id },
      include: {
        coverRequest: {
          include: {
            shift: { include: { user: { select: { companyId: true } } } },
            requester: { select: { id: true, userName: true, email: true } },
          },
        },
        bidder: { select: { id: true, userName: true, email: true } },
      },
    });

    const io = getIO();
    io.to(`company:${bid.coverRequest.shift.user.companyId}`).emit("coverBid:approved", updated);

    const shift = await prisma.scheduledShift.findUnique({
      where: { id: bid.coverRequest.shiftId },
      include: { user: { select: { companyId: true } } },
    });
    if (shift) {
      const dateStr = shift.date.toISOString().split("T")[0];
      const start = new Date(`${dateStr}T${shift.startTime}:00`).toISOString();
      const end = new Date(`${dateStr}T${shift.endTime}:00`).toISOString();
      io.to(`company:${shift.user.companyId}`).emit("shift:updated", {
        id: shift.id,
        title: shift.title || "",
        userId: shift.userId,
        start,
        end,
        note: shift.note,
        isPublished: shift.status === "PUBLISHED",
        extendedProps: { isPublished: shift.status === "PUBLISHED", status: shift.status },
      });
    }

    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to approve cover bid" });
  }
};

// Reject a cover bid (manager only)
export const rejectCoverBid = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!user.isManager) return res.status(403).json({ error: "Only managers can reject cover bids" });

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: "Bid ID is required" });

    const bid = await prisma.coverBid.findUnique({
      where: { id },
      include: { coverRequest: { include: { shift: { include: { user: { select: { companyId: true } } } } } } },
    });

    if (!bid) return res.status(404).json({ error: "Cover bid not found" });
    if (bid.coverRequest.shift.user.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
    if (bid.status !== $Enums.CoverBidStatus.PENDING) return res.status(400).json({ error: "Bid is not pending" });

    const updated = await prisma.coverBid.update({
      where: { id },
      data: { status: $Enums.CoverBidStatus.REJECTED },
      include: {
        coverRequest: { include: { shift: { include: { user: { select: { companyId: true } } } }, requester: { select: { id: true, userName: true, email: true } } } },
        bidder: { select: { id: true, userName: true, email: true } },
      },
    });

    const io = getIO();
    io.to(`company:${updated.coverRequest.shift.user.companyId}`).emit("coverBid:rejected", updated);
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to reject cover bid" });
  }
};
