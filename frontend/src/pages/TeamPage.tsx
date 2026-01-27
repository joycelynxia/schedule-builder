import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import type { User } from "../types/models";
// import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useUser } from "../context/UserContext";
import "../styles/TeamPage.css";

function TeamPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [employees, setEmployees] = useState<User[]>([]);
  const [copied, setCopied] = useState(false);
  // const navigate = useNavigate();
  const [employeesLoading, setEmployeesLoading] = useState<boolean>(true);

  // Get user from context instead of fetching
  const { user, loading } = useUser();

  // Load shifts on mount (only after user is loaded)
  useEffect(() => {
    // Wait for user to be loaded
    if (loading) return;

    // If no user, don't fetch shifts
    if (!user) {
      setEmployeesLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        const response = await apiFetch(`/api/company/${user.companyId}`);
        const company = await response.json();
        console.log(company);
        setInviteCode(company.inviteCode);
        setEmployees(company.users);
      } catch (error) {
        console.error("Error fetching company:", error);
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchCompany();
    // const fetchEmployees = async () => {
    //   try {
    //     const response = await apiFetch(`/api/users/${user.companyId}`);
    //     const teamMembers: User[] = await response.json();

    //     setEmployees(teamMembers);
    //   } catch (err) {
    //     console.error("Error fetching shifts:", err);
    //   } finally {
    //     setEmployeesLoading(false);
    //   }
    // };

    // fetchEmployees();
  }, [user, loading]); // Re-run if user changes

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="team-page">
      <Navbar />
      <div className="invite-code">
        <label>company invite code</label>
        <div style={{ display: "flex" }}>
          <input value={inviteCode} readOnly />
          <button onClick={() => copyToClipboard(inviteCode)}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <label>Current Team</label>
      {employeesLoading ? (
        <span>loading team members...</span>
      ) : (
        <table className="employee-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.userName}</td>
                <td>{emp.email}</td>
                <td>{emp.isManager ? "Manager" : "Employee"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TeamPage;
