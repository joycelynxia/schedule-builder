import React from "react";

interface Props {
  selectedWeek: Date;
  onWeekChange: (date: Date) => void;
}

function WeekSelector({ selectedWeek, onWeekChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onWeekChange(new Date(e.target.value));
  };

  const formattedDate = selectedWeek.toISOString().slice(0, 10);
  return (
    <div>
      <label>
        Select Week:
        <input type="date" value={formattedDate} onChange={handleChange} />
      </label>
    </div>
  );
}

export default WeekSelector;
