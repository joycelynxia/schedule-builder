import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import {
  getAllSwapRequests,
  approveSwapRequest,
  rejectSwapRequest,
  agreeSwapByPartner,
  declineSwapByPartner,
  listCoverBids,
  approveCoverBid,
  rejectCoverBid,
} from "../api";
import type { ShiftSwapRequest, CoverBid } from "../types/models";
import { useUser } from "../context/UserContext";
import { useSocket } from "../context/SocketContext";
import "../styles/SwapRequestsPage.css";

function SwapRequestsPage() {
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [bidsByCoverRequest, setBidsByCoverRequest] = useState<Record<string, CoverBid[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const { user } = useUser();
  const { socket } = useSocket();

  const fetchRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const requests = await getAllSwapRequests(filter === "all" ? undefined : filter);
      setSwapRequests(requests);
    } catch (error) {
      console.error("Error fetching swap requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async (requests: ShiftSwapRequest[]) => {
    if (!user?.isManager) return;
    const coverIds = requests
      .filter((r) => r.status === "PENDING" && !r.requestedUserId)
      .map((r) => r.id);
    if (coverIds.length === 0) {
      setBidsByCoverRequest({});
      return;
    }
    const acc: Record<string, CoverBid[]> = {};
    await Promise.all(
      coverIds.map(async (id) => {
        try {
          acc[id] = await listCoverBids(id);
        } catch {
          acc[id] = [];
        }
      })
    );
    setBidsByCoverRequest(acc);
  };

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user, filter]);

  useEffect(() => {
    if (!user?.isManager || !swapRequests.length) return;
    fetchBids(swapRequests);
  }, [user?.isManager, swapRequests, filter]);

  // Listen for real-time swap request updates
  useEffect(() => {
    if (!socket) return;

    const handleSwapRequestCreated = (request: ShiftSwapRequest) => {
      setSwapRequests((prev) => [request, ...prev]);
    };

    const handleSwapRequestApproved = (request: ShiftSwapRequest) => {
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === request.id ? request : r))
      );
    };

    const handleSwapRequestRejected = (request: ShiftSwapRequest) => {
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === request.id ? request : r))
      );
    };

    const handlePartnerAgreed = (request: ShiftSwapRequest) => {
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === request.id ? request : r))
      );
    };

    const handlePartnerDeclined = (request: ShiftSwapRequest) => {
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === request.id ? request : r))
      );
    };

    const handleCoverBidCreated = () => {
      fetchBids(swapRequests);
    };
    const handleCoverBidApproved = () => {
      fetchRequests();
    };
    const handleCoverBidRejected = () => {
      fetchBids(swapRequests);
    };

    socket.on("swapRequest:created", handleSwapRequestCreated);
    socket.on("swapRequest:approved", handleSwapRequestApproved);
    socket.on("swapRequest:rejected", handleSwapRequestRejected);
    socket.on("swapRequest:partnerAgreed", handlePartnerAgreed);
    socket.on("swapRequest:partnerDeclined", handlePartnerDeclined);
    socket.on("coverBid:created", handleCoverBidCreated);
    socket.on("coverBid:approved", handleCoverBidApproved);
    socket.on("coverBid:rejected", handleCoverBidRejected);

    return () => {
      socket.off("swapRequest:created", handleSwapRequestCreated);
      socket.off("swapRequest:approved", handleSwapRequestApproved);
      socket.off("swapRequest:rejected", handleSwapRequestRejected);
      socket.off("swapRequest:partnerAgreed", handlePartnerAgreed);
      socket.off("swapRequest:partnerDeclined", handlePartnerDeclined);
      socket.off("coverBid:created", handleCoverBidCreated);
      socket.off("coverBid:approved", handleCoverBidApproved);
      socket.off("coverBid:rejected", handleCoverBidRejected);
    };
  }, [socket]);

  const handleApprove = async (id: string) => {
    try {
      const updated = await approveSwapRequest(id);
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (error: any) {
      alert(error.message || "Failed to approve swap request");
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Are you sure you want to reject this swap request?")) {
      return;
    }
    try {
      const updated = await rejectSwapRequest(id);
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (error: any) {
      alert(error.message || "Failed to reject swap request");
    }
  };

  const handleAgree = async (id: string) => {
    try {
      const updated = await agreeSwapByPartner(id);
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (error: any) {
      alert(error.message || "Failed to agree to swap");
    }
  };

  const handleDecline = async (id: string) => {
    if (!window.confirm("Decline this swap request?")) return;
    try {
      const updated = await declineSwapByPartner(id);
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (error: any) {
      alert(error.message || "Failed to decline swap");
    }
  };

  const handleApproveBid = async (bidId: string) => {
    try {
      await approveCoverBid(bidId);
      await fetchRequests();
    } catch (error: any) {
      alert(error.message || "Failed to approve cover bid");
    }
  };

  const handleRejectBid = async (bidId: string) => {
    try {
      await rejectCoverBid(bidId);
      fetchBids(swapRequests);
    } catch (error: any) {
      alert(error.message || "Failed to reject cover bid");
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    // Handle both ISO date strings and time strings like "09:00"
    if (timeString.includes("T") || timeString.includes(":")) {
      // If it's an ISO string, parse it
      if (timeString.includes("T")) {
        return new Date(timeString).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
      // If it's a time string like "09:00", format it
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  const getStatusBadge = (status: string) => {
    const statusClass = status.toLowerCase();
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  const pendingRequests = swapRequests.filter((r) => r.status === "PENDING");
  const filteredRequests =
    filter === "all" ? swapRequests : swapRequests.filter((r) => r.status === filter);

  return (
    <div className="swap-requests-page">
      <Navbar />
      <div className="swap-requests-content">
        <div className="page-header">
          <h1>Shift Swap Requests</h1>
          {user?.isManager && pendingRequests.length > 0 && (
            <div className="pending-badge">
              {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({swapRequests.length})
          </button>
          <button
            className={filter === "PENDING" ? "active" : ""}
            onClick={() => setFilter("PENDING")}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            className={filter === "APPROVED" ? "active" : ""}
            onClick={() => setFilter("APPROVED")}
          >
            Approved ({swapRequests.filter((r) => r.status === "APPROVED").length})
          </button>
          <button
            className={filter === "REJECTED" ? "active" : ""}
            onClick={() => setFilter("REJECTED")}
          >
            Rejected ({swapRequests.filter((r) => r.status === "REJECTED").length})
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading swap requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <p>No swap requests found.</p>
          </div>
        ) : (
          <div className="requests-list">
            {filteredRequests.map((request) => (
              <div key={request.id} className="swap-request-card">
                <div className="request-header">
                  <div className="request-info">
                    <h3>
                      {request.shift.title || "Untitled Shift"}
                    </h3>
                    <div className="request-meta">
                      <span>{formatDate(request.shift.date)}</span>
                      <span>
                        {formatTime(request.shift.startTime || "")} - {formatTime(request.shift.endTime || "")}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="request-details">
                  <div className="detail-row">
                    <strong>Requested by:</strong>
                    <span>{request.requester.userName}</span>
                  </div>
                  {request.requestedUser ? (
                    <div className="detail-row">
                      <strong>Swap with:</strong>
                      <span>{request.requestedUser.userName}</span>
                    </div>
                  ) : (
                    <div className="detail-row">
                      <strong>Type:</strong>
                      <span>Cover Request (anyone can cover)</span>
                    </div>
                  )}
                  {request.reason && (
                    <div className="detail-row reason">
                      <strong>Reason:</strong>
                      <span>{request.reason}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <strong>Requested on:</strong>
                    <span>{formatDate(request.createdAt)}</span>
                  </div>
                </div>

                {/* Swap partner: Agree / Decline */}
                {request.requestedUserId === user?.id &&
                  request.status === "PENDING" && (
                    <div className="request-actions">
                      <button
                        className="approve-button"
                        onClick={() => handleAgree(request.id)}
                      >
                        Agree
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => handleDecline(request.id)}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                {/* Manager: Approve swap only after partner agreed; Reject swap */}
                {user?.isManager &&
                  request.status === "PENDING" &&
                  request.requestedUserId != null && (
                    <div className="request-actions">
                      {request.requestedUserApprovedAt ? (
                        <>
                          <button
                            className="approve-button"
                            onClick={() => handleApprove(request.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-button"
                            onClick={() => handleReject(request.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="waiting-partner">
                          Waiting for {request.requestedUser?.userName} to agree
                        </span>
                      )}
                    </div>
                  )}

                {/* Manager: Cover request – show bids, approve/reject bids */}
                {user?.isManager &&
                  request.status === "PENDING" &&
                  request.requestedUserId == null && (
                    <div className="cover-bids-section">
                      <strong>Cover bids</strong>
                      {(bidsByCoverRequest[request.id] ?? []).length === 0 ? (
                        <p className="no-bids">No bids yet.</p>
                      ) : (
                        <ul className="bids-list">
                          {(bidsByCoverRequest[request.id] ?? []).map(
                            (bid) =>
                              bid.status === "PENDING" && (
                                <li key={bid.id} className="bid-item">
                                  <span>{bid.bidder.userName}</span>
                                  <div className="bid-actions">
                                    <button
                                      className="approve-button small"
                                      onClick={() => handleApproveBid(bid.id)}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="reject-button small"
                                      onClick={() => handleRejectBid(bid.id)}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </li>
                              )
                          )}
                        </ul>
                      )}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SwapRequestsPage;
