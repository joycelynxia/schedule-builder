// export const API_URL = "https://schedulr-twoi.onrender.com"
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  return fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",

      // only include if exists
      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      ...options.headers,
    },
  });
};

// Swap Request API functions
import type { ShiftSwapRequest, CoverBid } from "./types/models";

export const createSwapRequest = async (
  shiftId: string,
  requestedUserId?: string,
  reason?: string
): Promise<ShiftSwapRequest> => {
  const response = await apiFetch("/api/swap-requests", {
    method: "POST",
    body: JSON.stringify({ shiftId, requestedUserId, reason }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create swap request");
  }
  return response.json();
};

export const getAllSwapRequests = async (
  status?: "PENDING" | "APPROVED" | "REJECTED",
  type?: "cover"
): Promise<ShiftSwapRequest[]> => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  const q = params.toString();
  const url = q ? `/api/swap-requests?${q}` : "/api/swap-requests";
  const response = await apiFetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch swap requests");
  }
  return response.json();
};

export const approveSwapRequest = async (
  id: string
): Promise<ShiftSwapRequest> => {
  const response = await apiFetch(`/api/swap-requests/${id}/approve`, {
    method: "PUT",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to approve swap request");
  }
  return response.json();
};

export const rejectSwapRequest = async (
  id: string
): Promise<ShiftSwapRequest> => {
  const response = await apiFetch(`/api/swap-requests/${id}/reject`, {
    method: "PUT",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to reject swap request");
  }
  return response.json();
};

export const agreeSwapByPartner = async (
  id: string
): Promise<ShiftSwapRequest> => {
  const response = await apiFetch(`/api/swap-requests/${id}/agree-by-partner`, {
    method: "PUT",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to agree to swap");
  }
  return response.json();
};

export const declineSwapByPartner = async (
  id: string
): Promise<ShiftSwapRequest> => {
  const response = await apiFetch(
    `/api/swap-requests/${id}/decline-by-partner`,
    { method: "PUT" }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to decline swap");
  }
  return response.json();
};

// Cover bid API
export const createCoverBid = async (
  coverRequestId: string
): Promise<CoverBid> => {
  const response = await apiFetch("/api/cover-bids", {
    method: "POST",
    body: JSON.stringify({ coverRequestId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to request cover");
  }
  return response.json();
};

export const listCoverBids = async (
  coverRequestId?: string
): Promise<CoverBid[]> => {
  const url = coverRequestId
    ? `/api/cover-bids?coverRequestId=${coverRequestId}`
    : "/api/cover-bids";
  const response = await apiFetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch cover bids");
  }
  return response.json();
};

export const approveCoverBid = async (id: string): Promise<CoverBid> => {
  const response = await apiFetch(`/api/cover-bids/${id}/approve`, {
    method: "PUT",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to approve cover bid");
  }
  return response.json();
};

export const rejectCoverBid = async (id: string): Promise<CoverBid> => {
  const response = await apiFetch(`/api/cover-bids/${id}/reject`, {
    method: "PUT",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to reject cover bid");
  }
  return response.json();
};
