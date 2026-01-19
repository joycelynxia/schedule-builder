import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "../styles/ManagerDashboard.css";
import { useEffect, useState } from "react";
import { type Shift } from "../types/models";
import WeeklyShiftEditor from "../components/WeeklyShiftEditor";
import "../styles/Calendar.css";
import type { Dictionary } from "@fullcalendar/core/internal";
import ToolTip from "../components/ToolTip";
import type { EventHoveringArg } from "@fullcalendar/core/index.js";
import { apiFetch } from "../api";

function SchedulePage() {
  const [draftShifts, setDraftShifts] = useState<Shift[]>([]);
  const [publishedShifts, setPublishedShifts] = useState<Shift[]>([]);
  const [isEditing, setIsEditing] = useState<Boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<Boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isToolTipOpen, setIsToolTipOpen] = useState<boolean>(false);
  const [currentEvent, setCurrentEvent] = useState<Dictionary>({});
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [user, setUser] = useState<{
    id: string;
    userName: string;
    isManager: boolean;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  // Load user and shifts on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Fetch current user
    fetch("http://localhost:4000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        // Fetch all shifts
        return apiFetch("/api/shifts");
      })
      .then((r) => r.json())
      .then((shifts: Shift[]) => {
        // Separate draft and published shifts
        const drafts = shifts.filter((s) => !s.isPublished);
        const published = shifts.filter((s) => s.isPublished);
        setDraftShifts(drafts);
        setPublishedShifts(published);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching shifts:", err);
        setLoading(false);
      });
  }, []);

  const addShift = (shift: Shift) => {
    setIsModalOpen(false);
    setEditingShift(null);
    // Shift is already saved to backend by WeeklyShiftEditor
    // Just update local state
    if (shift.isPublished) {
      setPublishedShifts((prev) => [...prev, shift]);
    } else {
      setDraftShifts((prev) => [...prev, shift]);
    }
  };

  const updateShift = (updatedShift: Shift) => {
    setIsModalOpen(false);
    setEditingShift(null);
    
    // Remove from current list and add to appropriate list
    setDraftShifts((prev) => prev.filter((s) => s.id !== updatedShift.id));
    setPublishedShifts((prev) => prev.filter((s) => s.id !== updatedShift.id));

    if (updatedShift.isPublished) {
      setPublishedShifts((prev) => [...prev, updatedShift]);
    } else {
      setDraftShifts((prev) => [...prev, updatedShift]);
    }
  };

  const deleteShift = (shiftId: string) => {
    setIsModalOpen(false);
    setEditingShift(null);
    
    // Remove from both lists
    setDraftShifts((prev) => prev.filter((s) => s.id !== shiftId));
    setPublishedShifts((prev) => prev.filter((s) => s.id !== shiftId));
  };

  const handlePublishClick = () => {
    if (!user?.isManager || draftShifts.length === 0) return;
    // Pre-select all shifts
    setSelectedShiftIds(new Set(draftShifts.map((s) => s.id)));
    setIsPublishModalOpen(true);
  };

  const handlePublishSchedule = async () => {
    if (!user?.isManager || selectedShiftIds.size === 0) return;

    try {
      const shiftIds = Array.from(selectedShiftIds);
      const response = await apiFetch("/api/shifts/publish", {
        method: "POST",
        body: JSON.stringify({ shiftIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to publish shifts");
      }

      const published = await response.json();
      // Remove published shifts from drafts and add to published
      setDraftShifts((prev) => prev.filter((s) => !selectedShiftIds.has(s.id)));
      setPublishedShifts((prev) => [...prev, ...published]);
      setSelectedShiftIds(new Set());
      setIsPublishModalOpen(false);
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error publishing shifts:", error);
      alert(error.message || "Failed to publish shifts");
    }
  };

  const handleDeleteSelected = async () => {
    if (!user?.isManager || selectedShiftIds.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedShiftIds.size} shift${selectedShiftIds.size > 1 ? "s" : ""}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const shiftIds = Array.from(selectedShiftIds);
      
      // Delete each shift (API supports single deletion)
      const deletePromises = shiftIds.map((id) =>
        apiFetch(`/api/shifts/${id}`, {
          method: "DELETE",
        })
      );

      await Promise.all(deletePromises);

      // Remove deleted shifts from drafts
      setDraftShifts((prev) => prev.filter((s) => !selectedShiftIds.has(s.id)));
      setSelectedShiftIds(new Set());
      setIsPublishModalOpen(false);
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error deleting shifts:", error);
      alert(error.message || "Failed to delete shifts");
    }
  };

  const toggleShiftSelection = (shiftId: string) => {
    setSelectedShiftIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  const selectAllShifts = () => {
    setSelectedShiftIds(new Set(draftShifts.map((s) => s.id)));
  };

  const deselectAllShifts = () => {
    setSelectedShiftIds(new Set());
  };

  const formatShiftTime = (start: string, end: string) => {
    const startTime = new Date(start).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const endTime = new Date(end).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${startTime} - ${endTime}`;
  };

  const formatShiftDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Combine all shifts for calendar display with color differentiation
  const allShifts = [
    ...draftShifts.map((shift) => ({
      ...shift,
      backgroundColor: "#9e9e9e", // Gray for drafts
      borderColor: "#757575",
      textColor: "white",
    })),
    ...publishedShifts.map((shift) => ({
      ...shift,
      // Keep default colors for published (FullCalendar default)
    })),
  ];

  const handleEventClick = (info: EventHoveringArg) => {
    if (!user?.isManager) return;
    
    // Find the shift from allShifts using the event ID
    const clickedShift = allShifts.find(
      (s) => s.id === info.event.id || s.id === String(info.event.id)
    );
    
    if (clickedShift) {
      setEditingShift(clickedShift);
      setSelectedDate(clickedShift.start.split("T")[0]);
      setIsModalOpen(true);
    }
  };

  const handleDateClick = (info: string) => {
    if (!user?.isManager) return;
    setSelectedDate(info);
    setEditingShift(null); // Clear editing shift when creating new
    setIsModalOpen(true);
  };

  const handleMouseEnter = (info: EventHoveringArg) => {
    setCurrentEvent(info.event.toJSON());

    const harness = info.el.closest(".fc-daygrid-event-harness") ?? info.el;
    const rect = harness.getBoundingClientRect();

    const x = rect.left + rect.width / 2;
    const y = rect.top;

    setTooltipPosition({ x, y });
    setIsToolTipOpen(true);
  };


  return (
    <div className="page-container dashboard-container">
      <div>
        {/* <button onClick={() => console.log(user?.isManager)}>is manager</button> */}
        {/* <h1>manager dashboard</h1> */}
        <div className="modal">
          {isModalOpen && (
            <WeeklyShiftEditor
              draftShifts={draftShifts}
              onAddShift={addShift}
              onUpdateShift={updateShift}
              onDeleteShift={deleteShift}
              onCancelShift={() => {
                setIsModalOpen(false);
                setEditingShift(null);
              }}
              date={selectedDate}
              editingShift={editingShift}
            />
          )}
        </div>
        {user?.isManager && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {draftShifts.length > 0 && (
              <button onClick={handlePublishClick}>
                Bulk Edit ({draftShifts.length} draft{draftShifts.length !== 1 ? "s" : ""})
              </button>
            )}
          </div>
        )}
        
        {/* Publish Preview Modal */}
        {isPublishModalOpen && (
          <div className="overlay publish-modal-overlay">
            <div className="shift-modal publish-modal-content">
              <div className="shift-modal-header">
                <h2>Bulk Edit Draft Shifts</h2>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => {
                    setIsPublishModalOpen(false);
                    setSelectedShiftIds(new Set());
                  }}
                >
                  ×
                </button>
              </div>

              <div className="selection-buttons-container">
                <button
                  type="button"
                  className="selection-button"
                  onClick={selectAllShifts}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="selection-button"
                  onClick={deselectAllShifts}
                >
                  Deselect All
                </button>
              </div>

              <div className="shifts-list-container">
                {draftShifts.map((shift) => (
                  <label
                    key={shift.id}
                    className={`shift-item ${selectedShiftIds.has(shift.id) ? "selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedShiftIds.has(shift.id)}
                      onChange={() => toggleShiftSelection(shift.id)}
                    />
                    <div className="shift-item-content">
                      <div className="shift-item-title">{shift.title}</div>
                      <div className="shift-item-date">
                        {formatShiftDate(shift.start)} • {formatShiftTime(shift.start, shift.end)}
                      </div>
                      {shift.note && (
                        <div className="shift-item-note">
                          {shift.note}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="form-buttons publish-form-buttons">
                <button
                  type="button"
                  className="delete-button"
                  onClick={handleDeleteSelected}
                  disabled={selectedShiftIds.size === 0}
                >
                  Delete Selected ({selectedShiftIds.size})
                </button>
                <div className="form-buttons-right">
                  <button
                    type="button"
                    className="submit"
                    onClick={handlePublishSchedule}
                    disabled={selectedShiftIds.size === 0}
                  >
                    Publish Selected ({selectedShiftIds.size})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              start: 'prev,next today',
              center: 'title',
              end: 'dayGridMonth,timeGridWeek',
            }}
            events={allShifts}
            aspectRatio={1}
            contentHeight={500}
            dateClick={(info) => handleDateClick(info.dateStr)}
            eventClick={handleEventClick}
            eventMouseEnter={(info) => handleMouseEnter(info)}
            eventMouseLeave={() => setIsToolTipOpen(false)}
          />
        </div>
        {isToolTipOpen && (
          <ToolTip
            eventInfo={currentEvent}
            X={tooltipPosition.x}
            Y={tooltipPosition.y}
          />
        )}
        {/* </div> */}
      </div>
    </div>
  );
}

export default SchedulePage;
