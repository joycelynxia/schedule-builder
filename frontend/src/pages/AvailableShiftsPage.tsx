import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getAllSwapRequests, createCoverBid, listCoverBids } from "../api";
import type { ShiftSwapRequest } from "../types/models";
import { useUser } from "../context/UserContext";
import { useSocket } from "../context/SocketContext";
import "../styles/AvailableShiftsPage.css";

function AvailableShiftsPage() {
  const [coverRequests, setCoverRequests] = useState<ShiftSwapRequest[]>([]);
  const [coverRequestIdsUserBidOn, setCoverRequestIdsUserBidOn] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState<string | null>(null);
  const { user } = useUser();
  const { socket } = useSocket();

  const fetchCoverRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await getAllSwapRequests("PENDING", "cover");
      setCoverRequests(list);
    } catch (e) {
      console.error("Error fetching cover requests:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBids = async () => {
    if (!user) return;
    try {
      const bids = await listCoverBids();
      const ids = new Set(bids.map((b) => b.coverRequestId));
      setCoverRequestIdsUserBidOn(ids);
    } catch (e) {
      console.error("Error fetching user cover bids:", e);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchCoverRequests();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUserBids();
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const onCreated = () => fetchCoverRequests();
    const onApproved = () => {
      fetchCoverRequests();
      fetchUserBids();
    };
    socket.on("swapRequest:created", onCreated);
    socket.on("coverBid:approved", onApproved);
    socket.on("coverBid:created", fetchUserBids);
    return () => {
      socket.off("swapRequest:created", onCreated);
      socket.off("coverBid:approved", onApproved);
      socket.off("coverBid:created", fetchUserBids);
    };
  }, [socket, user]);

  const handleRequestCover = async (coverRequest: ShiftSwapRequest) => {
    if (coverRequest.requesterId === user?.id) return;
    try {
      setBidding(coverRequest.id);
      await createCoverBid(coverRequest.id);
      await fetchUserBids();
      await fetchCoverRequests();
    } catch (e: any) {
      alert(e?.message || "Failed to request cover");
    } finally {
      setBidding(null);
    }
  };

  const formatDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (t: string) => {
    if (t.includes("T")) return new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const [h, m] = t.split(":");
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  return (
    <div className="available-shifts-page">
      <Navbar />
      <div className="available-shifts-content">
        <h1>Available Shifts (Need Cover)</h1>
        <p className="subtitle">These shifts need cover. Request to cover one and your manager can approve.</p>

        {loading ? (
          <div className="loading">Loading…</div>
        ) : coverRequests.length === 0 ? (
          <div className="empty">No shifts need cover right now.</div>
        ) : (
          <ul className="cover-requests-list">
            {coverRequests.map((req) => {
              const shift = req.shift;
              const isOwn = req.requesterId === user?.id;
              return (
                <li key={req.id} className="cover-request-card">
                  <div className="shift-info">
                    <h3>{shift.title || "Untitled shift"}</h3>
                    <p><strong>Date:</strong> {formatDate(shift.date)}</p>
                    <p><strong>Time:</strong> {formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p>
                    <p><strong>Requested by:</strong> {req.requester.userName}</p>
                    {req.reason && <p><strong>Reason:</strong> {req.reason}</p>}
                  </div>
                  {!isOwn && (
                    coverRequestIdsUserBidOn.has(req.id) ? (
                      <span className="requested-label">Requested</span>
                    ) : (
                      <button
                        className="request-cover-btn"
                        onClick={() => handleRequestCover(req)}
                        disabled={!!bidding}
                      >
                        {bidding === req.id ? "Submitting…" : "Request to cover"}
                      </button>
                    )
                  )}
                  {isOwn && <span className="own-label">Your request</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AvailableShiftsPage;
