import type { UnavailabilityRule } from "../types/models";
import "../styles/ConflictDialog.css";

interface Props {
  conflictingRules: UnavailabilityRule[];
  onReplace: () => void;
  onCancel: () => void;
}

function ConflictDialog({ conflictingRules, onReplace, onCancel }: Props) {
  const formatRuleDescription = (rule: UnavailabilityRule): string => {
    let description = "";

    // Date range
    const startDate = new Date(rule.startDate).toLocaleDateString();
    const endDate = new Date(rule.endDate).toLocaleDateString();
    description = `${startDate} - ${endDate}`;

    // Recurrence
    if (rule.recurrence) {
      if (rule.recurrence.frequency === "weekly") {
        const days = rule.recurrence.daysOfWeek?.join(", ") || "selected days";
        const interval = rule.recurrence.interval > 1 ? `every ${rule.recurrence.interval} weeks` : "weekly";
        description += ` (${days}, ${interval})`;
      } else if (rule.recurrence.frequency === "daily") {
        const interval = rule.recurrence.interval > 1 ? `every ${rule.recurrence.interval} days` : "daily";
        description += ` (${interval})`;
      }
    }

    // Time range or all-day
    if (rule.allDay) {
      description += " - All day";
    } else if (rule.timeRange) {
      description += ` - ${rule.timeRange.startTime} to ${rule.timeRange.endTime}`;
    }

    return description;
  };

  return (
    <div className="overlay">
      <div className="conflict-dialog">
        <div className="modal-header">
          <h3>Conflicting Unavailability Rules</h3>
          <button
            type="button"
            className="close-button"
            onClick={onCancel}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="conflict-message">
          The new unavailability rule conflicts with {conflictingRules.length} existing rule{conflictingRules.length > 1 ? "s" : ""}.
        </p>

        <div className="conflicting-rules-list">
          {conflictingRules.map((rule, index) => (
            <div key={rule.id || index} className="conflict-rule-item">
              <div className="rule-description">
                {formatRuleDescription(rule)}
              </div>
            </div>
          ))}
        </div>

        <div className="conflict-dialog-buttons">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="replace-button"
            onClick={onReplace}
          >
            Replace Conflicting Rules
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConflictDialog;
