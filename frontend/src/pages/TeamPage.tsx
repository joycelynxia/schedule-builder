import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import type { User } from "../types/models";
import { apiFetch } from "../api";
import { useUser } from "../context/UserContext";
import "../styles/TeamPage.css";

function TeamPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [employees, setEmployees] = useState<User[]>([]);
  const [copied, setCopied] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState<boolean>(true);

  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setEmployeesLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        const response = await apiFetch(`/api/company/${user.companyId}`);
        const company = await response.json();
        setInviteCode(company.inviteCode);
        setEmployees(company.users);
      } catch (error) {
        console.error("Error fetching company:", error);
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchCompany();
  }, [user, loading]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="team-page">
      <Navbar />

      <div className="invite-code">
        <label>Company Invite Code</label>
        <div className="invite-code-input">
          <input value={inviteCode} readOnly />
          <button onClick={() => copyToClipboard(inviteCode)}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <label>Current Team</label>
      {employeesLoading ? (
        <span>Loading team members...</span>
      ) : (
        <div className="table-container">
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
                  <td data-label="Name">{emp.userName}</td>
                  <td data-label="Email">{emp.email}</td>
                  <td data-label="Role">
                    {emp.isManager ? "Manager" : "Employee"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TeamPage;
