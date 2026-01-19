export interface Employee {
  id: string;
  userName: string;
  isManager: boolean;
  // maxHoursPerWeek: number;
}

export interface Shift {
  id: string;
  title: string;
  userId: string;
  // employeeName?: string;
  // date: string | Date;
  start: string;
  end: string;
  note?: string;
  isPublished: boolean;
  // requiredEmployees: number;
}

export type DayOfWeek = "Sun" | "Mon"| "Tue"| "Wed"| "Thu"| "Fri"| "Sat";

export interface UnavailabilityRule {
  id?: string;
  userId?: string;
  startDate: string;
  endDate: string;
  recurrence?: {
    frequency: "daily" | "weekly"
    interval: number;
    daysOfWeek?: DayOfWeek[]
  };
  timeRange?: {
    startTime: string;
    endTime: string;
  }
  allDay?: boolean;
}