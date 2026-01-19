import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MyAccountPage.css";
import { apiFetch } from "../api";

function MyAccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{
    id: string;
    userName: string;
    email: string;
    isManager: boolean;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Editing states
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [isEditingPassword, setIsEditingPassword] = useState<boolean>(false);

  // Form values
  const [newEmail, setNewEmail] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Error messages
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

      const API_BASE = import.meta.env.VITE_API_BASE_URL;

    // Fetch current user
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setNewEmail(data.email);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
        navigate("/");
      });
  }, [navigate]);

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess("");
    setEmailError("");
    setPasswordError("");

    let hasChanges = false;
    const errors: string[] = [];

    // Validate and prepare email update
    if (isEditingEmail) {
      if (!newEmail) {
        errors.push("Email is required");
        setEmailError("Email is required");
      } else if (newEmail !== user?.email) {
        hasChanges = true;
      }
    }

    // Validate password update
    if (isEditingPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        errors.push("All password fields are required");
        setPasswordError("All password fields are required");
      } else if (newPassword !== confirmPassword) {
        errors.push("New passwords do not match");
        setPasswordError("New passwords do not match");
      } else if (newPassword.length < 6) {
        errors.push("Password must be at least 6 characters");
        setPasswordError("Password must be at least 6 characters");
      } else {
        hasChanges = true;
      }
    }

    if (errors.length > 0 || !hasChanges) {
      if (!hasChanges) {
        setSaveError("No changes to save");
      }
      return;
    }

    try {
      // Update email if edited
      if (isEditingEmail && newEmail !== user?.email) {
        const emailResponse = await apiFetch("/api/users/email", {
          method: "PUT",
          body: JSON.stringify({ email: newEmail }),
        });

        if (!emailResponse.ok) {
          const error = await emailResponse.json();
          throw new Error(error.error || "Failed to update email");
        }

        const updatedUser = await emailResponse.json();
        setUser(updatedUser);
        setIsEditingEmail(false);
      }

      // Update password if edited
      if (isEditingPassword) {
        const passwordResponse = await apiFetch("/api/users/password", {
          method: "PUT",
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        if (!passwordResponse.ok) {
          const error = await passwordResponse.json();
          throw new Error(error.error || "Failed to update password");
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsEditingPassword(false);
      }

      setSaveSuccess("Account updated successfully!");
    } catch (error: any) {
      console.error("Error updating account:", error);
      setSaveError(error.message || "Failed to update account");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleCancelEdit = () => {
    setIsEditingEmail(false);
    setIsEditingPassword(false);
    setNewEmail(user?.email || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setEmailError("");
    setPasswordError("");
    setSaveError("");
    setSaveSuccess("");
  };

  const handleEditEmail = () => {
    setIsEditingEmail(true);
    setNewEmail(user?.email || "");
    setEmailError("");
  };

  const handleEditPassword = () => {
    setIsEditingPassword(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const hasUnsavedChanges = () => {
    return (
      (isEditingEmail && newEmail !== user?.email) ||
      (isEditingPassword && (currentPassword || newPassword || confirmPassword))
    );
  };

  // Pencil icon SVG
  const PencilIcon = () => (
    <svg
      className="edit-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.68601 11.9439 1.59124C12.1715 1.49648 12.4142 1.44775 12.6593 1.44775C12.9044 1.44775 13.1471 1.49648 13.3747 1.59124C13.6023 1.68601 13.8102 1.8249 13.9853 2.00001C14.1604 2.17512 14.2993 2.38302 14.3941 2.6106C14.4888 2.83818 14.5376 3.08088 14.5376 3.32601C14.5376 3.57114 14.4888 3.81384 14.3941 4.04142C14.2993 4.269 14.1604 4.4769 13.9853 4.65201L5.17667 13.4607L1.33334 14.6667L2.53934 10.8233L11.3333 2.00001Z"
        stroke="#666"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (loading) {
    return <div className="my-account-page">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="my-account-page">
      <h1 className="my-account-title">General</h1>

      {/* Username Section */}
      <div className="account-section">
        <div className="account-field">
          <label className="account-label">Username</label>
          <div className="account-value-display">
            {user.userName}

          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className="account-section">
        <div className="account-field">
          <label className="account-label">Email</label>
          {isEditingEmail ? (
            <div className="account-input-wrapper">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailError("");
                }}
                className="account-input editable"
                autoFocus
                required
              />
              {emailError && <div className="error-message">{emailError}</div>}
            </div>
          ) : (
            <div 
              className="account-input-display" 
              onClick={handleEditEmail}
            >
              {user.email}
              <PencilIcon />
            </div>
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="account-section">
        <div className="account-field">
          <label className="account-label">Password</label>
          {isEditingPassword ? (
            <div className="account-input-wrapper">
              <div className="password-fields">
                <div className="password-field">
                  <label className="password-label">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="account-input"
                    required
                  />
                </div>
                <div className="password-field">
                  <label className="password-label">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="account-input"
                    required
                  />
                </div>
                <div className="password-field">
                  <label className="password-label">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="account-input"
                    required
                  />
                </div>
              </div>
              {passwordError && <div className="error-message">{passwordError}</div>}
            </div>
          ) : (
            <div 
              className="account-input-display" 
              onClick={handleEditPassword}
            >
              ••••••••
              <PencilIcon />
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {saveError && <div className="error-message" style={{ marginTop: "1rem" }}>{saveError}</div>}
      {saveSuccess && <div className="success-message" style={{ marginTop: "1rem" }}>{saveSuccess}</div>}

      {/* Save/Cancel Buttons */}
      <div className="account-actions">
        <div className="save-cancel-buttons">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="account-button cancel"
            disabled={!hasUnsavedChanges()}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="account-button save"
            disabled={!hasUnsavedChanges()}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <div className="account-actions">
        <button
          type="button"
          onClick={handleLogout}
          className="account-button logout"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

export default MyAccountPage;
