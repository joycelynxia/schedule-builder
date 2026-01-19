import { useState, useEffect } from "react";
import type { DayOfWeek, UnavailabilityRule } from "../types/models";
import "../styles/UnavailabilityEditor.css";

interface Props {
  onCancel: () => void;
  onAdd: (availability: UnavailabilityRule) => void;
  onUpdate?: (availability: UnavailabilityRule) => void;
  onDelete?: () => void;
  date: string;
  editingRule?: UnavailabilityRule;
}

const daysOfWeek: DayOfWeek[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function AvailabilityEditor({ onCancel, onAdd, onUpdate, onDelete, date, editingRule }: Props) {
  // const [startDate, setStartDate] = useState<string>(date);
  const [endDate, setEndDate] = useState<string>(date);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [note, setNote] = useState<string>("");
  const [isAllDay, setIsAllDay] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [interval, setInterval] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);

  // Load editing rule data when editingRule is provided
  useEffect(() => {
    if (editingRule) {
      setEndDate(editingRule.endDate);
      setIsAllDay(editingRule.allDay || false);
      setIsRepeat(!!editingRule.recurrence);
      
      if (editingRule.timeRange) {
        setStartTime(editingRule.timeRange.startTime);
        setEndTime(editingRule.timeRange.endTime);
      }
      
      if (editingRule.recurrence) {
        setFrequency(editingRule.recurrence.frequency);
        setInterval(editingRule.recurrence.interval);
        if (editingRule.recurrence.daysOfWeek) {
          setSelectedDays(editingRule.recurrence.daysOfWeek);
        }
      }
    }
  }, [editingRule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const recurrence = isRepeat
      ? {
          frequency,
          interval,
          ...(frequency === "weekly" && { daysOfWeek: selectedDays }),
        }
      : undefined;

    const timeOrAllDay = isAllDay
      ? { allDay: true }
      : { allDay: false, timeRange: { startTime, endTime } };

    const unavailability: UnavailabilityRule = {
      ...(editingRule?.id && { id: editingRule.id }),
      startDate: editingRule?.startDate || date,
      endDate: endDate,
      ...(recurrence && { recurrence }),
      ...timeOrAllDay,
    } as UnavailabilityRule;

    if (onUpdate && editingRule) {
      onUpdate(unavailability);
    } else {
      onAdd(unavailability);
    }
  };

  const handleAllDayChange = () => {
    if (isAllDay) {
      setStartTime("09:00");
      setEndTime("17:00");
    }
    setIsAllDay(!isAllDay);
  };

  const handleRepeat = () => {
    if (isRepeat) {
      setEndDate(date);
    }
    setIsRepeat(!isRepeat);
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d != day) : [...prev, day]
    );
    console.log(selectedDays);
  };

  const unit =
    frequency === "daily"
      ? interval === 1
        ? "day"
        : "days"
      : interval === 1
      ? "week"
      : "weeks";

  return (
    <div className="overlay">
      <form className="availability-modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>{editingRule ? "Edit Unavailability" : `Declare Unavailability for ${date}`}</h3>
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
        {/* <label>Unavailable on {date}</label> */}
        <label className="checkbox" style={{display:"flex"}}>
          <input
            value="isAllDay"
            type="checkbox"
            checked={isAllDay}
            onChange={handleAllDayChange}
          />
          all day
        </label>

        <label>
          Start Time:
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            disabled={isAllDay ? true : false}
          />
        </label>

        <label>
          End Time:
          <input
            type="time"
            value={endTime}
            min={startTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            disabled={isAllDay ? true : false}
          />
        </label>

        <label>
          Note:
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <label className="checkbox">
          <input
            value="isRepeat"
            type="checkbox"
            checked={isRepeat}
            onChange={handleRepeat}
          />
          Repeat shifts
        </label>

        {isRepeat && (
          <div className="">
            <div className="repeat-freq">
              <label>
                repeats
                <select
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as "daily" | "weekly")
                  }
                >
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                </select>
              </label>

              <label>
                every
                <input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  required
                />
                {unit}
              </label>
            </div>
            <div className="repeat-days">

            {frequency === "weekly" &&
              daysOfWeek.map((day) => {
                const isActive = selectedDays.includes(day);

                return (
                  <span
                    key={day}
                    className={`days-of-week ${isActive ? "active" : ""}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day[0]}
                  </span>
                );
              })}
            </div>

            <label>
              Repeat ends on
              <input
                min={date}
                value={endDate}
                type="date"
                required
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        )}
        {/* <button onClick={() => console.log(selectedDays)}>print</button> */}

        <div className="form-buttons">
          {editingRule && onDelete && (
            <button
              type="button"
              className="delete-button"
              onClick={onDelete}
            >
              Delete
            </button>
          )}
          <div className="form-buttons-right">
            <button className="submit" type="submit">
              Confirm
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AvailabilityEditor;
