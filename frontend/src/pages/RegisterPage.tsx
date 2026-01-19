import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";   // reuse same styling

function RegisterPage() {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Auto login after register
      localStorage.setItem("token", data.token);

      nav("/schedule");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2 className="header">register</h2>

        <label>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="username"
            required
          />
        </label>

        <label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            required
          />
        </label>

        <label>
          <input
            type="password"
            value={password}
            placeholder="password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label>
          <input
            type="password"
            value={confirm}
            placeholder="confirm password"
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>

        <button className="login-button" type="submit">
          create account
        </button>

        <p
          style={{ cursor: "pointer", marginTop: "8px" }}
          onClick={() => nav("/")}
        >
          already have an account? login
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
