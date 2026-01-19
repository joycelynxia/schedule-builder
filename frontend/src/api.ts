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
