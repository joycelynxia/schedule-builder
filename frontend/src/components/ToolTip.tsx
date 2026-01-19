import type { Dictionary } from "@fullcalendar/core/internal";
import { convertToLocalTime } from "../utils/stringHelper";
import "../styles/ToolTip.css"

interface Props {
  eventInfo: Dictionary;
  X: number;
  Y: number;
}

function ToolTip({ eventInfo, X, Y }: Props) {
  const printInfo = () => {
    console.log(eventInfo);
  };

  const formatHours = () => {
    if (eventInfo.end && eventInfo.start) {
      return `${convertToLocalTime(eventInfo.start)} - ${convertToLocalTime(eventInfo.end)}`
    } else {
      return `All Day`
    }
  }

  return (
    <div className="tooltip" style={{left:X, top:Y, whiteSpace: "nowrap",}}>
      <span>{formatHours()}</span>
      <span>{eventInfo.title}</span>
      <span>{eventInfo.extendedProps?.note}</span>
    </div>
  );
}

export default ToolTip;
