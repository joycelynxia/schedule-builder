import { useState } from "react";
import "../styles/LoginPage.css";
import { useNavigate } from "react-router-dom";
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:4000/auth/login", {
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
      nav("/schedule");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2 className="header">login</h2>
        {/* <div className="inputs-container"> */}
        <label>
          <input
            // type="email"
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
        {/* </div> */}
        <button className="login-button" type="submit">
          log in
        </button>
        <p
          style={{ cursor: "pointer", marginTop: "8px" }}
          onClick={() => nav("/register")}
        >
          need an account? register
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
