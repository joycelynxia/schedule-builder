import { useEffect, useState } from "react";
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
    <div className="page team-page">
      <div className="page-header">
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">Manage your company invite code and view team members.</p>
      </div>

      <div className="content-card invite-code-section">
        <label className="section-label">Company Invite Code</label>
        <div className="invite-code-input">
          <input value={inviteCode} readOnly />
          <button className="btn-primary" onClick={() => copyToClipboard(inviteCode)}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="team-section">
        <label className="section-label">Current Team</label>
        {employeesLoading ? (
          <div className="loading-state">Loading team members…</div>
        ) : (
          <div className="content-card table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((emp) => (
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
    </div>
  );
}

export default TeamPage;
