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
import type { EventHoveringArg, DateSelectArg } from "@fullcalendar/core/index.js";
import { apiFetch } from "../api";
import { useUser } from "../context/UserContext";
import { useSocket } from "../context/SocketContext";
import SwapRequestDialog from "../components/SwapRequestDialog";
import CoverRequestDialog from "../components/CoverRequestDialog";

function SchedulePage() {
  const [draftShifts, setDraftShifts] = useState<Shift[]>([]);
  const [publishedShifts, setPublishedShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<Boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isToolTipOpen, setIsToolTipOpen] = useState<boolean>(false);
  const [currentEvent, setCurrentEvent] = useState<Dictionary>({});
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [shiftsLoading, setShiftsLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>("dayGridMonth");
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [swapRequestDialogOpen, setSwapRequestDialogOpen] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<Shift | null>(null);
  const [coverRequestDialogOpen, setCoverRequestDialogOpen] = useState(false);
  const [selectedShiftForCover, setSelectedShiftForCover] = useState<Shift | null>(null);
  const [shiftView, setShiftView] = useState<"all" | "mine">("all");

  // Get user from context instead of fetching
  const { user, loading } = useUser();
  const { socket } = useSocket();

  // Load shifts on mount (only after user is loaded)
  useEffect(() => {
    // Wait for user to be loaded
    if (loading) return;
    
    // If no user, don't fetch shifts
    if (!user) {
      setShiftsLoading(false);
      return;
    }

    const fetchShifts = async () => {
      try {
        const response = await apiFetch("/api/shifts");
        const shifts: Shift[] = await response.json();
        const drafts = shifts.filter((s) => !s.isPublished);
        const published = shifts.filter((s) => s.isPublished);
        setDraftShifts(drafts);
        setPublishedShifts(published);
      } catch (err) {
        console.error("Error fetching shifts:", err);
      } finally {
        setShiftsLoading(false);
      }
    };

    fetchShifts();
  }, [user, loading]);

  // Listen for real-time shift updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleShiftCreated = (shift: Shift) => {
      // Only add if not already in the list (avoid duplicates from own actions)
      setDraftShifts((prev) => {
        if (prev.some((s) => s.id === shift.id)) return prev;
        return shift.isPublished ? prev : [...prev, shift];
      });
      setPublishedShifts((prev) => {
        if (prev.some((s) => s.id === shift.id)) return prev;
        return shift.isPublished ? [...prev, shift] : prev;
      });
    };

    const handleShiftUpdated = (shift: Shift) => {
      // Remove from both lists and add to appropriate list
      setDraftShifts((prev) => {
        const filtered = prev.filter((s) => s.id !== shift.id);
        return shift.isPublished ? filtered : [...filtered, shift];
      });
      setPublishedShifts((prev) => {
        const filtered = prev.filter((s) => s.id !== shift.id);
        return shift.isPublished ? [...filtered, shift] : filtered;
      });
    };

    const handleShiftDeleted = (data: { id: string }) => {
      // Remove from both lists
      setDraftShifts((prev) => prev.filter((s) => s.id !== data.id));
      setPublishedShifts((prev) => prev.filter((s) => s.id !== data.id));
    };

    const refetchShifts = () => {
      if (!user) return;
      apiFetch("/api/shifts")
        .then((r) => r.json())
        .then((shifts: Shift[]) => {
          const drafts = shifts.filter((s) => !s.isPublished);
          const published = shifts.filter((s) => s.isPublished);
          setDraftShifts(drafts);
          setPublishedShifts(published);
        })
        .catch(console.error);
    };

    const handleCoverBidApproved = () => refetchShifts();
    const handleSwapApproved = () => refetchShifts();

    socket.on("shift:created", handleShiftCreated);
    socket.on("shift:updated", handleShiftUpdated);
    socket.on("shift:deleted", handleShiftDeleted);
    socket.on("coverBid:approved", handleCoverBidApproved);
    socket.on("swapRequest:approved", handleSwapApproved);

    return () => {
      socket.off("shift:created", handleShiftCreated);
      socket.off("shift:updated", handleShiftUpdated);
      socket.off("shift:deleted", handleShiftDeleted);
      socket.off("coverBid:approved", handleCoverBidApproved);
      socket.off("swapRequest:approved", handleSwapApproved);
    };
  }, [socket, user]);

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
  const allShiftsRaw = [
    ...draftShifts.map((shift) => ({
      ...shift,
      backgroundColor: "#9e9e9e", // Gray for drafts
      borderColor: "#757575",
      textColor: "white",
    })),
    ...publishedShifts.map((shift) => ({
      ...shift,
      ...(shift.needsCover
        ? { backgroundColor: "#c62828", borderColor: "#b71c1c", textColor: "white" }
        : {}),
    })),
  ];

  // Filter by view: "all" (company) or "mine" (user's shifts only)
  const allShifts =
    shiftView === "mine" && user
      ? allShiftsRaw.filter((s) => s.userId === user.id)
      : allShiftsRaw;

  const handleEventClick = (info: EventHoveringArg) => {
    const clickedShift = allShifts.find(
      (s) => s.id === info.event.id || s.id === String(info.event.id)
    );
    if (!clickedShift) return;

    if (user?.isManager) {
      setEditingShift(clickedShift);
      setSelectedDate(clickedShift.start.split("T")[0]);
      setIsModalOpen(true);
      return;
    }

    // Own published shift: request swap/cover
    if (clickedShift.userId === user?.id && clickedShift.isPublished) {
      setSelectedShiftForSwap(clickedShift);
      setSwapRequestDialogOpen(true);
      return;
    }

    // Someone else's shift needing cover: request to cover
    if (
      clickedShift.isPublished &&
      clickedShift.needsCover &&
      clickedShift.coverRequestId &&
      clickedShift.userId !== user?.id
    ) {
      setSelectedShiftForCover(clickedShift);
      setCoverRequestDialogOpen(true);
    }
  };

  const handleDateClick = (info: string) => {
    if (!user?.isManager) return;
    setSelectedDate(info);
    setSelectedStartTime(null); // Clear selected times for date click
    setSelectedEndTime(null);
    setEditingShift(null); // Clear editing shift when creating new
    setIsModalOpen(true);
  };

  // Handle drag selection in week view to create shifts
  const handleSelect = (selectInfo: DateSelectArg) => {
    if (!user?.isManager) {
      selectInfo.view.calendar.unselect();
      return;
    }

    // Only allow selection in week view
    if (selectInfo.view.type !== "timeGridWeek") {
      selectInfo.view.calendar.unselect();
      return;
    }

    const start = selectInfo.start;
    const end = selectInfo.end;
    
    // Extract date and times
    const dateStr = start.toISOString().split("T")[0];
    const startTime = start.toTimeString().slice(0, 5); // HH:MM format
    const endTime = end.toTimeString().slice(0, 5); // HH:MM format

    setSelectedDate(dateStr);
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
    setEditingShift(null);
    
    // Open modal
    setIsModalOpen(true);
    
    // Unselect the selection
    selectInfo.view.calendar.unselect();
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

  // Show loading state while user or shifts are loading
  if (loading || shiftsLoading) {
    return (
      <div className="page-container dashboard-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Optional: Handle case where user is not logged in
  if (!user) {
    return (
      <div className="page-container dashboard-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Please log in to view schedules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container dashboard-container">
      <div>
        <div className="modal">
          {isModalOpen && (
            <WeeklyShiftEditor
              draftShifts={draftShifts}
              onAddShift={(shift) => {
                addShift(shift);
                setSelectedStartTime(null);
                setSelectedEndTime(null);
              }}
              onUpdateShift={(shift) => {
                updateShift(shift);
                setSelectedStartTime(null);
                setSelectedEndTime(null);
              }}
              onDeleteShift={deleteShift}
              onCancelShift={() => {
                setIsModalOpen(false);
                setEditingShift(null);
                setSelectedStartTime(null);
                setSelectedEndTime(null);
              }}
              date={selectedDate}
              editingShift={editingShift}
              initialStartTime={selectedStartTime}
              initialEndTime={selectedEndTime}
            />
          )}
        </div>
        <div className="schedule-toolbar">
          <div className="shift-view-toggle">
            <button
              type="button"
              className={shiftView === "all" ? "active" : ""}
              onClick={() => setShiftView("all")}
              aria-pressed={shiftView === "all"}
            >
              All shifts
            </button>
            <button
              type="button"
              className={shiftView === "mine" ? "active" : ""}
              onClick={() => setShiftView("mine")}
              aria-pressed={shiftView === "mine"}
            >
              My shifts
            </button>
          </div>
          {user?.isManager && draftShifts.length > 0 && (
            <button onClick={handlePublishClick} className="bulk-edit-btn">
              Bulk Edit ({draftShifts.length} draft{draftShifts.length !== 1 ? "s" : ""})
            </button>
          )}
        </div>
        
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
            selectable={user?.isManager && currentView === "timeGridWeek"}
            selectMirror={true}
            selectOverlap={false}
            dateClick={(info) => handleDateClick(info.dateStr)}
            select={handleSelect}
            viewDidMount={(view) => setCurrentView(view.view.type)}
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
        {swapRequestDialogOpen && selectedShiftForSwap && (
          <SwapRequestDialog
            shift={selectedShiftForSwap}
            onClose={() => {
              setSwapRequestDialogOpen(false);
              setSelectedShiftForSwap(null);
            }}
            onSuccess={() => {}}
          />
        )}
        {coverRequestDialogOpen && selectedShiftForCover && (
          <CoverRequestDialog
            shift={selectedShiftForCover}
            onClose={() => {
              setCoverRequestDialogOpen(false);
              setSelectedShiftForCover(null);
            }}
            onSuccess={() => {}}
          />
        )}
      </div>
    </div>
  );
}

export default SchedulePage;