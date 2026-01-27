import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SchedulePage from "./pages/SchedulePage";
import Header from "./components/Navbar";
import AvailabilityPage from "./pages/AvailabilityPage";
import { useLocation } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import MyAccountPage from "./pages/MyAccountPage";
import TeamPage from "./pages/TeamPage";
import { UserProvider } from "./context/UserContext";
import "./App.css"
function App() {
  const location = useLocation();
  const hideHeaderOn = ["/", "/register"];
  const shouldHideHeader = hideHeaderOn.includes(location.pathname);

  return (
    <UserProvider>
      <div className="app-container">
        {!shouldHideHeader && <Header />}
        <div className={shouldHideHeader ? "login-register" : "main-content"}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route path="/account" element={<MyAccountPage />} />
            <Route path="/team" element={<TeamPage />} />
          </Routes>
        </div>
      </div>
    </UserProvider>
  );
}

export default App;
