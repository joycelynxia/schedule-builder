import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; // needed for dateClick/select
import "../styles/Calendar.css";
import AvailabilityEditor from "../components/AvailabilityEditor";
import ConflictDialog from "../components/ConflictDialog";
import { useState, useMemo, useEffect } from "react";
import type { UnavailabilityRule, DayOfWeek } from "../types/models";
import type { EventHoveringArg, EventInput, EventClickArg } from "@fullcalendar/core"
import { combineDateAndTime, toDateOnly } from "../utils/stringHelper";
import ToolTip from "../components/ToolTip";
import type { Dictionary } from "@fullcalendar/core/internal";
import { apiFetch } from "../api";

function AvailabilityPage() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [date, setDate] = useState<string>("");
  const [unavailabilityRules, setUnavailabilityRules] = useState<
    UnavailabilityRule[]
  >([]);
  const [calendarStart, setCalendarStart] = useState<string>("");
  const [calendarEnd, setCalendarEnd] = useState<string>("");
  const [isToolTipOpen, setIsToolTipOpen] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [currentEvent, setCurrentEvent] = useState<Dictionary>({});
  const [editingRule, setEditingRule] = useState<UnavailabilityRule | null>(null);
  const [conflictingRules, setConflictingRules] = useState<UnavailabilityRule[]>([]);
  const [pendingRule, setPendingRule] = useState<UnavailabilityRule | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState<boolean>(false);

  // Fetch current user and existing rules on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Fetch current user and then their rules
    fetch("http://localhost:4000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        // Fetch unavailability rules for this user
        return apiFetch(`/api/unavailabilityRules/user/${data.id}`);
      })
      .then((r) => r.json())
      .then((rules) => {
        setUnavailabilityRules(rules);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
      });
  }, []);

  const handleDateClick = (info: string) => {
    console.log(info);
    setDate(info);
    setEditingRule(null); // Clear editing rule when creating new
    setIsModalOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const ruleId = info.event.extendedProps.ruleId;
    if (!ruleId) return;
    
    // Find the rule by ID
    const clickedRule = unavailabilityRules.find(r => r.id === ruleId);
    if (clickedRule) {
      setEditingRule(clickedRule);
      setDate(clickedRule.startDate);
      setIsModalOpen(true);
    }
  };

  // Check if two time ranges overlap
  const doTimeRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const start1Time = new Date(`2000-01-01T${start1}:00`).getTime();
    const end1Time = new Date(`2000-01-01T${end1}:00`).getTime();
    const start2Time = new Date(`2000-01-01T${start2}:00`).getTime();
    const end2Time = new Date(`2000-01-01T${end2}:00`).getTime();

    return start1Time < end2Time && end1Time > start2Time;
  };

  // Generate all date occurrences for a rule
  const generateRuleDates = (rule: UnavailabilityRule): string[] => {
    const dates: string[] = [];
    const startDate = new Date(rule.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(rule.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (!rule.recurrence) {
      // Single date range
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (rule.recurrence.frequency === "daily") {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + rule.recurrence.interval);
      }
    } else if (rule.recurrence.frequency === "weekly") {
      const dayMap: Record<DayOfWeek, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };

      const targetDays = rule.recurrence.daysOfWeek || [];
      if (targetDays.length === 0) {
        const dayNames: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        targetDays.push(dayNames[startDate.getDay()] as DayOfWeek);
      }

      for (const dayName of targetDays) {
        const targetDayOfWeek = dayMap[dayName];
        const firstOccurrence = new Date(startDate);
        const startDayOfWeek = firstOccurrence.getDay();
        let daysToFirst = targetDayOfWeek - startDayOfWeek;
        if (daysToFirst < 0) {
          daysToFirst += 7;
        }
        firstOccurrence.setDate(firstOccurrence.getDate() + daysToFirst);

        let currentDate = new Date(firstOccurrence);
        while (currentDate <= endDate) {
          dates.push(currentDate.toISOString().split("T")[0]);
          currentDate.setDate(currentDate.getDate() + 7 * rule.recurrence.interval);
        }
      }
    }

    return dates;
  };

  // Check if two rules conflict
  const checkRulesConflict = (
    newRule: UnavailabilityRule,
    existingRule: UnavailabilityRule
  ): boolean => {
    // Get all date occurrences for both rules
    const newRuleDates = generateRuleDates(newRule);
    const existingRuleDates = generateRuleDates(existingRule);

    // Find overlapping dates
    const overlappingDates = newRuleDates.filter((date) =>
      existingRuleDates.includes(date)
    );

    if (overlappingDates.length === 0) {
      return false; // No date overlap, no conflict
    }

    // If either rule is all-day, they conflict on overlapping dates
    if (newRule.allDay || existingRule.allDay || !newRule.timeRange || !existingRule.timeRange) {
      return true;
    }

    // Check if time ranges overlap (same for all dates in the rule)
    return doTimeRangesOverlap(
      newRule.timeRange!.startTime,
      newRule.timeRange!.endTime,
      existingRule.timeRange!.startTime,
      existingRule.timeRange!.endTime
    );
  };

  // Check for conflicts with existing rules
  const checkForConflicts = (
    newRule: UnavailabilityRule,
    existingRules: UnavailabilityRule[]
  ): UnavailabilityRule[] => {
    return existingRules.filter((existingRule) =>
      checkRulesConflict(newRule, existingRule)
    );
  };

  const handleAdd = async (availability: UnavailabilityRule) => {
    // Check for conflicts with existing rules
    const conflicts = checkForConflicts(availability, unavailabilityRules);

    if (conflicts.length > 0) {
      // Show conflict dialog instead of creating immediately
      setConflictingRules(conflicts);
      setPendingRule(availability);
      setShowConflictDialog(true);
      setIsModalOpen(false); // Close the editor modal
      return;
    }

    // No conflicts, proceed with creation
    try {
      const response = await apiFetch("/api/unavailabilityRules", {
        method: "POST",
        body: JSON.stringify(availability),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save unavailability rule");
      }

      const savedRule = await response.json();
      setUnavailabilityRules((prev) => [...prev, savedRule]);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving unavailability rule:", error);
      alert(error.message || "Failed to save unavailability rule");
    }
  };

  const handleReplaceConflicts = async () => {
    if (!pendingRule) return;

    try {
      // Delete all conflicting rules
      const deletePromises = conflictingRules
        .filter((rule) => rule.id)
        .map((rule) =>
          apiFetch(`/api/unavailabilityRules/${rule.id}`, {
            method: "DELETE",
          })
        );

      await Promise.all(deletePromises);

      // Create the new rule
      const response = await apiFetch("/api/unavailabilityRules", {
        method: "POST",
        body: JSON.stringify(pendingRule),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save unavailability rule");
      }

      const savedRule = await response.json();

      // Update state: remove deleted rules and add new one
      setUnavailabilityRules((prev) => [
        ...prev.filter(
          (r) => !conflictingRules.some((cr) => cr.id === r.id)
        ),
        savedRule,
      ]);

      // Close dialogs and reset state
      setShowConflictDialog(false);
      setConflictingRules([]);
      setPendingRule(null);
    } catch (error: any) {
      console.error("Error replacing conflicting rules:", error);
      alert(error.message || "Failed to replace conflicting rules");
    }
  };

  const handleCancelConflict = () => {
    setShowConflictDialog(false);
    setConflictingRules([]);
    setPendingRule(null);
  };

  const handleUpdate = async (availability: UnavailabilityRule) => {
    if (!editingRule?.id) return;
    
    try {
      const response = await apiFetch(`/api/unavailabilityRules/${editingRule.id}`, {
        method: "PUT",
        body: JSON.stringify(availability),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update unavailability rule");
      }

      const updatedRule = await response.json();
      setUnavailabilityRules((prev) =>
        prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      );
      setIsModalOpen(false);
      setEditingRule(null);
    } catch (error: any) {
      console.error("Error updating unavailability rule:", error);
      alert(error.message || "Failed to update unavailability rule");
    }
  };

  const handleDelete = async () => {
    if (!editingRule?.id) return;
    
    if (!window.confirm("Are you sure you want to delete this unavailability rule?")) {
      return;
    }

    try {
      const response = await apiFetch(`/api/unavailabilityRules/${editingRule.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete unavailability rule");
      }

      setUnavailabilityRules((prev) =>
        prev.filter((r) => r.id !== editingRule.id)
      );
      setIsModalOpen(false);
      setEditingRule(null);
    } catch (error: any) {
      console.error("Error deleting unavailability rule:", error);
      alert(error.message || "Failed to delete unavailability rule");
    }
  };

  const expandRuleToEvents = (rule: UnavailabilityRule): EventInput[] => {
    let events: EventInput[] = [];
    const ruleId = rule.id || "";

    // single event
    if (!rule.recurrence) {
      if (toDateOnly(rule.startDate) >= toDateOnly(calendarStart)) {
        if (rule.timeRange) {
          events.push({
            title: "unavailable",
            start: combineDateAndTime(rule.startDate, rule.timeRange.startTime),
            end: combineDateAndTime(rule.endDate, rule.timeRange.endTime),
            extendedProps: { ruleId },
          })
        } else {
          // all day
          events.push({
            title: "unavailable",
            start: rule.startDate,
            end: rule.endDate,
            extendedProps: { ruleId },
          })
        }
      }
    } else {
      // recurring event
      const recurrence = rule.recurrence;
      const startDate = new Date(rule.startDate);
      const endDate = new Date(rule.endDate);
      const calendarStartDate = calendarStart ? new Date(calendarStart) : null;
      const calendarEndDate = calendarEnd ? new Date(calendarEnd) : null;

      if (recurrence.frequency === "daily") {
        // Generate events every x days
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          // Only include events within the visible calendar range
          if (!calendarStartDate || currentDate >= calendarStartDate) {
            if (!calendarEndDate || currentDate <= calendarEndDate) {
              if (rule.timeRange) {
                events.push({
                  title: "unavailable",
                  start: combineDateAndTime(
                    currentDate.toISOString().split("T")[0],
                    rule.timeRange.startTime
                  ),
                  end: combineDateAndTime(
                    currentDate.toISOString().split("T")[0],
                    rule.timeRange.endTime
                  ),
                  extendedProps: { ruleId },
                });
              } else {
                // all day
                events.push({
                  title: "unavailable",
                  start: currentDate.toISOString().split("T")[0],
                  allDay: true,
                  extendedProps: { ruleId },
                });
              }
            }
          }
          // Move to next occurrence (add interval days)
          currentDate.setDate(currentDate.getDate() + recurrence.interval);
        }
      } else if (recurrence.frequency === "weekly") {
        // Map day names to day numbers (0 = Sunday, 6 = Saturday)
        const dayMap: Record<DayOfWeek, number> = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };

        const targetDays = recurrence.daysOfWeek || [];
        if (targetDays.length === 0) {
          // If no days specified, use the start date's day of week
          targetDays.push(
            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
              startDate.getDay()
            ] as DayOfWeek
          );
        }

        // For each target day, generate occurrences every x weeks
        for (const dayName of targetDays) {
          const targetDayOfWeek = dayMap[dayName];
          
          // Find the first occurrence of this day on or after startDate
          const firstOccurrence = new Date(startDate);
          const startDayOfWeek = firstOccurrence.getDay();
          let daysToFirst = targetDayOfWeek - startDayOfWeek - 1;
          if (daysToFirst < 0) {
            daysToFirst += 7;
          }
          firstOccurrence.setDate(firstOccurrence.getDate() + daysToFirst);
          
          // Generate all occurrences of this day
          let currentDate = new Date(firstOccurrence);
          while (currentDate <= endDate) {
            // Only include if within the calendar view
            if (!calendarStartDate || currentDate >= calendarStartDate) {
              if (!calendarEndDate || currentDate <= calendarEndDate) {
                const dateStr = currentDate.toISOString().split("T")[0];
                
                if (rule.timeRange) {
                  events.push({
                    title: "unavailable",
                    start: combineDateAndTime(dateStr, rule.timeRange.startTime),
                    end: combineDateAndTime(dateStr, rule.timeRange.endTime),
                    extendedProps: { ruleId },
                  });
                } else {
                  // all day
                  events.push({
                    title: "unavailable",
                    start: dateStr,
                    allDay: true,
                    extendedProps: { ruleId },
                  });
                }
              }
            }
            
            // Move to next occurrence (add interval weeks)
            currentDate.setDate(currentDate.getDate() + 7 * recurrence.interval);
          }
        }
      }
    }
    console.log('events:', events)
    return events;
  };

  // Compute events from all rules
  const events = useMemo(() => {
    if (!calendarStart || !calendarEnd) {
      return [];
    }
    return unavailabilityRules.flatMap((rule) => expandRuleToEvents(rule));
  }, [unavailabilityRules, calendarStart, calendarEnd]);

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
    <div className="page-container">
      {isModalOpen && (
        <AvailabilityEditor
          onCancel={() => {
            setIsModalOpen(false);
            setEditingRule(null);
          }}
          onAdd={handleAdd}
          onUpdate={editingRule ? handleUpdate : undefined}
          onDelete={editingRule ? handleDelete : undefined}
          date={date}
          editingRule={editingRule || undefined}
        />
      )}
      {showConflictDialog && (
        <ConflictDialog
          conflictingRules={conflictingRules}
          onReplace={handleReplaceConflicts}
          onCancel={handleCancelConflict}
        />
      )}
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          aspectRatio={1}
          contentHeight={500}
          dateClick={(info) => handleDateClick(info.dateStr)}
          datesSet={(info) => {
            console.log(info),
            setCalendarStart(info.startStr), setCalendarEnd(info.endStr);
          }}
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
      {/* <button
        onClick={() => {
          console.log(calendarStart, calendarEnd);
        }}
      >
        print
      </button> */}
    </div>
  );
}
export default AvailabilityPage;
