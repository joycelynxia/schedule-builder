// export const apiFetch = (url: string, options: RequestInit = {}) => {
//   const token = localStorage.getItem("token");

//   return fetch("http://localhost:4000" + url, {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: token ? `Bearer ${token}` : "",
//       ...options.headers,
//     },
//   });
// };
export const API_URL = "http://localhost:4000";

export const apiFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  return fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",

      // only include if exists
      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      ...options.headers,
    },
  });
};
