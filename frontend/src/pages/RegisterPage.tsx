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
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
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

        <div className="company-setup" style={{ display: "flex" }}>
          <button type="button" onClick={() => setIsNewCompany(true)} style={isNewCompany ? {} : {background:"gray"}}>
            Create New
          </button>
          <button type="button" onClick={() => setIsNewCompany(false)} style={isNewCompany ? {background:"gray"} : {}}>
            Join Existing
          </button>
        </div>

        <label>
          <input
            type="companyStr"
            value={companyStr}
            placeholder={isNewCompany ? "company name" : "company invite code"}
            onChange={(e) => setCompanyStr(e.target.value)}
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
