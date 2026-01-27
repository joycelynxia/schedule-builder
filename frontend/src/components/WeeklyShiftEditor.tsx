import { useEffect, useState, useRef } from "react";
import type { Shift, UnavailabilityRule, DayOfWeek } from "../types/models";
import "../styles/ShiftEditor.css";
import Select from "react-select";
import { apiFetch } from "../api";
import { useUser } from "../context/UserContext";

interface Props {
  draftShifts: Shift[];
  onAddShift: (shift: Shift) => void;
  onUpdateShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onCancelShift: () => void;
  date: string;
  editingShift?: Shift | null;
}

interface OptionType {
  value: string;
  label: string;
  isAvailable?: boolean;
}

interface UserWithAvailability {
  id: string;
  userName: string;
  unavailabilityRules: UnavailabilityRule[];
}

type ShiftStatus = "DRAFT" | "PUBLISHED";

function WeeklyShiftEditor({
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onCancelShift,
  date,
  editingShift,
}: Props) {
  const isEditing = !!editingShift;
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [users, setUsers] = useState<UserWithAvailability[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<OptionType[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<
    readonly OptionType[]
  >([]);
  const [note, setNote] = useState<string>("");
  const [timeError, setTimeError] = useState<string>("");
  const {user, loading} = useUser();

  // Check if a user is available for a given date and time range
  // Approach: Check if shift date falls between rule dates, matches day of week (for weekly), and time overlaps
  const checkUserAvailability = (
    rules: UnavailabilityRule[],
    shiftDate: string,
    shiftStartTime: string,
    shiftEndTime: string
  ): boolean => {
    if (!shiftDate || !shiftStartTime || !shiftEndTime) return true;

    // Convert shift date to Date object for comparison
    const shiftDateObj = new Date(shiftDate);
    shiftDateObj.setHours(0, 0, 0, 0);
    
    // Get shift day of week (0 = Sunday, 6 = Saturday)
    const shiftDayOfWeek = shiftDateObj.getDay();
    const dayNames: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const shiftDayName = dayNames[shiftDayOfWeek];

    // Parse shift times for overlap checking
    const shiftStart = new Date(`${shiftDate}T${shiftStartTime}:00`);
    const shiftEnd = new Date(`${shiftDate}T${shiftEndTime}:00`);

    // Go through each unavailability rule
    for (const rule of rules) {
      const ruleStartDate = new Date(rule.startDate);
      ruleStartDate.setHours(0, 0, 0, 0);
      const ruleEndDate = new Date(rule.endDate);
      ruleEndDate.setHours(0, 0, 0, 0);

      // Step 1: Check if shift date falls between rule start and end date
      if (shiftDateObj < ruleStartDate || shiftDateObj > ruleEndDate) {
        continue; // This rule doesn't apply to this date
      }

      // Step 2: Check recurrence pattern if it's a recurring rule
      if (rule.recurrence) {
        if (rule.recurrence.frequency === "weekly") {
          // For weekly: check if shift lands on a selected day of week
          const selectedDays = rule.recurrence.daysOfWeek || [];
          if (selectedDays.length > 0 && !selectedDays.includes(shiftDayName)) {
            continue; // Day of week doesn't match, user is available
          }
          // If interval > 1, check if this occurrence matches the pattern
          if (rule.recurrence.interval > 1) {
            const weeksDiff = Math.floor((shiftDateObj.getTime() - ruleStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
            if (weeksDiff % rule.recurrence.interval !== 0) {
              continue; // Doesn't match interval pattern
            }
          }
        } else if (rule.recurrence.frequency === "daily") {
          // For daily: check if this occurrence matches the interval
          if (rule.recurrence.interval > 1) {
            const daysDiff = Math.floor((shiftDateObj.getTime() - ruleStartDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff % rule.recurrence.interval !== 0) {
              continue; // Doesn't match interval pattern
            }
          }
        }
      }

      // Step 3: Check if time matches (overlaps)
      // If all-day, user is unavailable for entire day
      if (rule.allDay || !rule.timeRange) {
        return false; // Unavailable - all day rule applies
      }

      // Check if shift time overlaps with rule time
      const ruleStart = new Date(`${shiftDate}T${rule.timeRange.startTime}:00`);
      const ruleEnd = new Date(`${shiftDate}T${rule.timeRange.endTime}:00`);
      
      // Time overlap: shift starts before rule ends AND shift ends after rule starts
      if (shiftStart < ruleEnd && shiftEnd > ruleStart) {
        return false; // Unavailable - time overlaps
      }
    }

    // No rules matched - user is available
    return true;
  };

  // Load users and their unavailability rules
  useEffect(() => {
    Promise.all([
      apiFetch(`/api/users/${user?.companyId}`).then((res) => res.json()),
      apiFetch("/api/unavailabilityRules").then((res) => res.json()),
    ]).then(([usersData, rulesData]) => {
      const usersWithRules = usersData.map((user: { id: string; userName: string }) => ({
        id: user.id,
        userName: user.userName,
        unavailabilityRules: rulesData.filter(
          (rule: UnavailabilityRule) => rule.userId === user.id
        ),
      }));
      setUsers(usersWithRules);
    });
  }, []);

  // Update employee options when date/time changes, sorted by availability
  useEffect(() => {
    if (date && startTime && endTime) {
      const optionsWithAvailability: OptionType[] = users.map((user) => {
        const isAvailable = checkUserAvailability(
          user.unavailabilityRules,
          date,
          startTime,
          endTime
        );
        return {
          value: user.id,
          label: user.userName,
          isAvailable,
        };
      });

      // Sort: available first, then unavailable
      const sorted = optionsWithAvailability.sort((a, b) => {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        return 0;
      });

      setEmployeeOptions(sorted);
    } else if (users.length > 0) {
      // If no date/time, just show all users
      setEmployeeOptions(
        users.map((u) => ({
          value: u.id,
          label: u.userName,
          isAvailable: true,
        }))
      );
    }
  }, [date, startTime, endTime, users]);

  // Track previous editingShift ID to detect when it changes
  const prevEditingShiftIdRef = useRef<string | null>(null);

  // Load shift data when editing starts, or reset when creating new shift
  useEffect(() => {
    const currentShiftId = editingShift?.id || null;
    const prevShiftId = prevEditingShiftIdRef.current;

    // Only run when editingShift ID actually changes
    if (currentShiftId !== prevShiftId) {
      if (editingShift) {
        // Extract time from ISO datetime string
        const startDate = new Date(editingShift.start);
        const endDate = new Date(editingShift.end);
        
        // Format as HH:MM
        const formatTime = (date: Date) => {
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return `${hours}:${minutes}`;
        };

        setStartTime(formatTime(startDate));
        setEndTime(formatTime(endDate));
        setNote(editingShift.note || "");
      } else if (!editingShift && date) {
        // Reset form when creating new shift (only when modal opens)
        setStartTime("09:00");
        setEndTime("17:00");
        setNote("");
        setSelectedEmployees([]);
      }
      prevEditingShiftIdRef.current = currentShiftId;
    }
  }, [editingShift, date]);

  // Set selected employee when editing (separate effect to avoid resetting times)
  useEffect(() => {
    if (editingShift && employeeOptions.length > 0) {
      const employeeOption = employeeOptions.find(
        (opt) => opt.value === editingShift.userId
      );
      if (employeeOption) {
        setSelectedEmployees([employeeOption]);
      }
    }
  }, [editingShift, employeeOptions]);

  const handleSubmit = async (status?: ShiftStatus) => {
    if (!startTime || !endTime || selectedEmployees.length === 0) return;

    // Validate that end time is later than start time
    if (endTime <= startTime) {
      setTimeError("End time must be later than start time");
      return;
    }

    setTimeError(""); // Clear any existing errors

    try {
      if (isEditing && editingShift) {
        // Update existing shift
        const shiftDate = editingShift.start.split("T")[0];
        const payload: any = {
          title: selectedEmployees[0].label,
          date: shiftDate,
          startTime,
          endTime,
          note,
        };

        if (status) {
          payload.status = status;
        }

        const res = await apiFetch(`/api/shifts/${editingShift.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update shift");
        }

        const updatedShift = await res.json();
        onUpdateShift({
          id: updatedShift.id,
          title: updatedShift.title || "",
          userId: updatedShift.userId,
          start: updatedShift.start,
          end: updatedShift.end,
          note: updatedShift.note,
          isPublished: updatedShift.isPublished,
        });
      } else {
        // Create new shifts
        for (const emp of selectedEmployees) {
          const payload = {
            userId: emp.value,
            title: emp.label,
            date,
            startTime,
            endTime,
            note,
            status: status || "DRAFT",
          };

          const res = await apiFetch("/api/shifts", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to create shift");
          }

          const savedShift = await res.json();

          onAddShift({
            id: savedShift.id,
            title: savedShift.title || "",
            userId: savedShift.userId,
            start: savedShift.start,
            end: savedShift.end,
            note: savedShift.note,
            isPublished: savedShift.isPublished,
          });
        }
      }
    } catch (err: any) {
      console.error("failed to save shift", err);
      alert(err.message || "failed to save shift");
    }
  };

  const handleDelete = async () => {
    if (!editingShift) return;

    if (
      !confirm(
        `Are you sure you want to delete this shift for ${editingShift.title}?`
      )
    ) {
      return;
    }

    try {
      const res = await apiFetch(`/api/shifts/${editingShift.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete shift");
      }

      onDeleteShift(editingShift.id);
    } catch (err: any) {
      console.error("failed to delete shift", err);
      alert(err.message || "failed to delete shift");
    }
  };

  // Check if published shift date has passed
  const canDeletePublishedShift = () => {
    if (!editingShift || !editingShift.isPublished) return true;
    const shiftDate = new Date(editingShift.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    shiftDate.setHours(0, 0, 0, 0);
    return shiftDate >= today;
  };

  // const shiftDate = editingShift
  //   ? editingShift.start.split("T")[0]
  //   : date;

  return (
    <div className="overlay">
      <form className="shift-modal" onSubmit={(e) => e.preventDefault()}>
        <div className="shift-modal-header">
          <h2>
            {isEditing ? "Edit shift" : `Create shift on ${date}`}
          </h2>
          <button
            type="button"
            className="close-button"
            onClick={onCancelShift}
          >
            ×
          </button>
        </div>

        <label>
          Start Time:
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              // Clear error when start time changes
              if (timeError) setTimeError("");
            }}
            required
          />
        </label>

        <label>
          End Time:
          <input
            type="time"
            value={endTime}
            min={startTime || "00:00"}
            onChange={(e) => {
              const newEndTime = e.target.value;
              // Validate that end time is not earlier than start time
              if (startTime && newEndTime && newEndTime <= startTime) {
                setTimeError("End time must be later than start time");
              } else {
                setTimeError("");
              }
              setEndTime(newEndTime);
            }}
            required
          />
          {timeError && (
            <div style={{ color: "#f44336", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {timeError}
            </div>
          )}
        </label>

        <label>
          Select User{isEditing ? "" : "(s)"}
          <Select
            isMulti={!isEditing}
            options={employeeOptions}
            value={selectedEmployees}
            onChange={(newValue) => {
              if (Array.isArray(newValue)) {
                setSelectedEmployees(newValue);
              } else if (!newValue) {
                setSelectedEmployees([]);
              }
            }}
            isDisabled={isEditing}
            required
            formatOptionLabel={({ label, isAvailable }) => (
              <div>
                <div>{label}</div>
                {!isEditing && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: isAvailable ? "#4caf50" : "#f44336",
                      marginTop: "0.25rem",
                    }}
                  >
                    {isAvailable ? "✓ Available" : "✗ Unavailable"}
                  </div>
                )}
              </div>
            )}
          />
        </label>

        <label>
          Note:
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="form-buttons">
          <div className="form-buttons-left">
            {isEditing && (
              <button
                className="delete-button"
                onClick={handleDelete}
                disabled={editingShift?.isPublished && !canDeletePublishedShift()}
                title={
                  editingShift?.isPublished && !canDeletePublishedShift()
                    ? "Cannot delete past published shifts"
                    : "Delete shift"
                }
              >
                delete
              </button>
            )}
          </div>
          <div className="form-buttons-right">
            {isEditing ? (
              <>
                {!editingShift?.isPublished && (
                  <button
                    className="draft"
                    onClick={() => handleSubmit("DRAFT")}
                  >
                    save draft
                  </button>
                )}
                <button
                  className="submit"
                  onClick={() => handleSubmit(editingShift?.isPublished ? undefined : "PUBLISHED")}
                >
                  {editingShift?.isPublished ? "save" : "publish"}
                </button>
              </>
            ) : (
              <>
                <button className="draft" onClick={() => handleSubmit("DRAFT")}>
                  save draft
                </button>
                <button
                  className="add-shift-button submit"
                  onClick={() => handleSubmit("PUBLISHED")}
                >
                  add shift
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
export default WeeklyShiftEditor;
