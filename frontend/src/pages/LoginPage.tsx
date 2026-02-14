import { useState } from "react";
import "../styles/LoginPage.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();
  const { refetchUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      await refetchUser();
      nav("/schedule");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <div className="login-header">
          <h1 className="login-logo">Schedulr</h1>
          <p className="login-subtitle">Sign in to view and manage your schedule.</p>
        </div>
        <label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            placeholder="Email"
            required
          />
        </label>
        <label>
          <input
            type="password"
            value={password}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="login-button" type="submit">
          Sign in
        </button>
        <a
          type="button"
          className="auth-link"
          onClick={() => nav("/register")}
        >
          Need an account? Register
        </a>
      </form>
    </div>
  );
}

export default LoginPage;
