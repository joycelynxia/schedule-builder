import { useState, useEffect } from "react";
import { apiFetch, createSwapRequest } from "../api";
import type { Shift } from "../types/models";
import "../styles/SwapRequestDialog.css";
import { useUser } from "../context/UserContext";

interface Props {
  shift: Shift;
  onClose: () => void;
  onSuccess: () => void;
}

function SwapRequestDialog({ shift, onClose, onSuccess }: Props) {
  const [requestType, setRequestType] = useState<"cover" | "swap">("cover");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { user: currentUser } = useUser();

  // Fetch published shifts for swap options
  useEffect(() => {
    if (!currentUser || requestType !== "swap") return;

    const fetchShifts = async () => {
      try {
        const response = await apiFetch("/api/shifts");
        const allShifts: Shift[] = await response.json();
        
        const now = new Date();
        const currentShiftDate = shift.start.split("T")[0];
        const currentShiftStart = shift.start;
        const currentShiftEnd = shift.end;
        
        // Filter shifts:
        // 1. Must be published
        // 2. Must not have passed yet
        // 3. Must not belong to the current user (can't swap with yourself)
        // 4. Must not have the same date and time as current shift
        const filtered = allShifts.filter((s) => {
          // Must be published
          if (!s.isPublished) return false;
          
          // Must not have passed yet
          const shiftEnd = new Date(s.end);
          if (shiftEnd < now) return false;
          
          // Must not belong to current user (can't swap with yourself)
          if (s.userId === currentUser.id) return false;
          
          // Must not have the same date and time as current shift
          const shiftDate = s.start.split("T")[0];
          if (shiftDate === currentShiftDate && 
              s.start === currentShiftStart && 
              s.end === currentShiftEnd) {
            return false;
          }
          
          return true;
        });
        
        setAvailableShifts(filtered);
      } catch (err) {
        console.error("Error fetching shifts:", err);
        setError("Failed to load available shifts");
      }
    };

    fetchShifts();
  }, [currentUser, requestType, shift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (requestType === "swap" && !selectedShiftId) {
        setError("Please select a shift to swap with");
        setLoading(false);
        return;
      }

      // For swap requests, get the userId from the selected shift
      let requestedUserId: string | undefined;
      if (requestType === "swap" && selectedShiftId) {
        const selectedShift = availableShifts.find((s) => s.id === selectedShiftId);
        if (!selectedShift) {
          setError("Selected shift not found");
          setLoading(false);
          return;
        }
        requestedUserId = selectedShift.userId;
      }

      await createSwapRequest(
        shift.id,
        requestedUserId,
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

  const formatShiftDisplay = (shift: Shift) => {
    const date = formatShiftDate(shift.start);
    const time = `${formatShiftTime(shift.start)} - ${formatShiftTime(shift.end)}`;
    return `${shift.title || "Untitled"} - ${date} (${time})`;
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
            <button
              type="button"
              className={`request-type-button ${requestType === "cover" ? "selected" : ""}`}
              onClick={() => {
                setRequestType("cover");
                setSelectedShiftId("");
              }}
            >
              Request Cover
            </button>
            <button
              type="button"
              className={`request-type-button ${requestType === "swap" ? "selected" : ""}`}
              onClick={() => setRequestType("swap")}
            >
              Request Swap
            </button>
          </div>

          {requestType === "swap" && (
            <div className="form-group">
              <label htmlFor="shift-select">Select Shift to Swap With:</label>
              <select
                id="shift-select"
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                required
              >
                <option value="">-- Select a shift --</option>
                {availableShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatShiftDisplay(s)}
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
