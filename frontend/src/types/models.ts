export interface User {
  email: string;
  id: string;
  userName: string;
  isManager: boolean;
  companyId: string;
  // maxHoursPerWeek: number;
}

export interface Shift {
  id: string;
  title: string;
  userId: string;
  start: string;
  end: string;
  note?: string;
  isPublished: boolean;
  needsCover?: boolean;
  coverRequestId?: string;
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

export interface ShiftSwapRequest {
  id: string;
  shiftId: string;
  requesterId: string;
  requestedUserId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedUserApprovedAt?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  shift: {
    id: string;
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    title?: string | null;
    note?: string | null;
    status: string;
    user: {
      id: string;
      userName: string;
      email: string;
    };
  };
  requester: {
    id: string;
    userName: string;
    email: string;
  };
  requestedUser?: {
    id: string;
    userName: string;
    email: string;
  } | null;
}

export interface CoverBid {
  id: string;
  coverRequestId: string;
  bidderId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  coverRequest?: {
    id: string;
    shiftId: string;
    shift: { id: string; userId: string; date: string; startTime: string; endTime: string; title?: string | null; user: { id: string; userName: string; email: string } };
    requester: { id: string; userName: string; email: string };
  };
  bidder: { id: string; userName: string; email: string };
}