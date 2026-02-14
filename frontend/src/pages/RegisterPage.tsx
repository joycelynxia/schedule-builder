import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css"; // reuse same styling

function RegisterPage() {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [companyStr, setCompanyStr] = useState("");
  const [isNewCompany, setIsNewCompany] = useState(false);

  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }
    // if not unique email - fail

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName,
          email,
          password,
          companyStr,
          isNewCompany,
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
        <div className="login-header">
          <h2 className="login-logo">Schedulr</h2>
          <p className="login-subtitle">Join to manage shifts with your team.</p>
        </div>

        <label>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Username"
            required
          />
        </label>

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

        <label>
          <input
            type="password"
            value={confirm}
            placeholder="Confirm password"
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>

        <div className="company-setup">
          <button
            type="button"
            className={isNewCompany ? "selected" : ""}
            onClick={() => setIsNewCompany(true)}
          >
            Create new company
          </button>
          <button
            type="button"
            className={!isNewCompany ? "selected" : ""}
            onClick={() => setIsNewCompany(false)}
          >
            Join existing
          </button>
        </div>

        <label>
          <input
            value={companyStr}
            placeholder={isNewCompany ? "Company name" : "Invite code"}
            onChange={(e) => setCompanyStr(e.target.value)}
            required
          />
        </label>

        <button className="login-button" type="submit">
          Create account
        </button>

        <a
          type="button"
          className="auth-link"
          onClick={() => nav("/")}
        >
          Already have an account? Sign in
        </a>
      </form>
    </div>
  );
}

export default RegisterPage;
