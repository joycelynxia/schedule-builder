import { useState, useEffect } from "react";
import { apiFetch, createSwapRequest } from "../api";
import type { User, Shift } from "../types/models";
import "../styles/SwapRequestDialog.css";
import { useUser } from "../context/UserContext";

interface Props {
  shift: Shift;
  onClose: () => void;
  onSuccess: () => void;
}

function SwapRequestDialog({ shift, onClose, onSuccess }: Props) {
  const [requestType, setRequestType] = useState<"cover" | "swap">("cover");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { user: currentUser } = useUser();

  // Fetch team members
  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      try {
        const response = await apiFetch(`/api/users/${currentUser.companyId}`);
        const usersData: User[] = await response.json();
        // Filter out current user from swap options
        const otherUsers = usersData.filter((u) => u.id !== currentUser.id);
        setUsers(otherUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load team members");
      }
    };

    fetchUsers();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (requestType === "swap" && !selectedUserId) {
        setError("Please select a team member to swap with");
        setLoading(false);
        return;
      }

      await createSwapRequest(
        shift.id,
        requestType === "swap" ? selectedUserId : undefined,
        reason || undefined
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create swap request");
    } finally {
      setLoading(false);
    }
  };

  const formatShiftDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatShiftTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="swap-request-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request Shift Swap/Cover</h3>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="shift-info">
          <p><strong>Shift:</strong> {shift.title || "Untitled Shift"}</p>
          <p><strong>Date:</strong> {formatShiftDate(shift.start)}</p>
          <p><strong>Time:</strong> {formatShiftTime(shift.start)} - {formatShiftTime(shift.end)}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="request-type-selector">
            <label>
              <input
                type="radio"
                value="cover"
                checked={requestType === "cover"}
                onChange={() => {
                  setRequestType("cover");
                  setSelectedUserId("");
                }}
              />
              <span>Request Cover (anyone can cover)</span>
            </label>
            <label>
              <input
                type="radio"
                value="swap"
                checked={requestType === "swap"}
                onChange={() => setRequestType("swap")}
              />
              <span>Request Swap (specific person)</span>
            </label>
          </div>

          {requestType === "swap" && (
            <div className="form-group">
              <label htmlFor="user-select">Select Team Member:</label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">-- Select a team member --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.userName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reason">Reason (Optional):</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need this swap/cover..."
              rows={4}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="dialog-buttons">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SwapRequestDialog;
