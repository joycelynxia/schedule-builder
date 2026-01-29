import { useState } from "react";
import { createCoverBid } from "../api";
import type { Shift } from "../types/models";
import "../styles/SwapRequestDialog.css";

interface Props {
  shift: Shift;
  onClose: () => void;
  onSuccess: () => void;
}

function CoverRequestDialog({ shift, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!shift.coverRequestId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createCoverBid(shift.coverRequestId!);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request cover");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="swap-request-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request to Cover Shift</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="shift-info">
          <p><strong>Shift:</strong> {shift.title || "Untitled"}</p>
          <p><strong>Date:</strong> {formatDate(shift.start)}</p>
          <p><strong>Time:</strong> {formatTime(shift.start)} – {formatTime(shift.end)}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="dialog-buttons">
            <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Submitting…" : "Request to cover"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CoverRequestDialog;
