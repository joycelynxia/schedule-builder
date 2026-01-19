import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import EmployeeDashboard from "./pages/AvailabilityPage";
import SchedulePage from "./pages/SchedulePage";
import Header from "./components/Navbar";
import AvailabilityPage from "./pages/AvailabilityPage";
import { useLocation } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import MyAccountPage from "./pages/MyAccountPage";

function App() {
  const location = useLocation();
  const hideHeaderOn = ["/","/register"];
  const shouldHideHeader = hideHeaderOn.includes(location.pathname);

  return (
    <>
      {!shouldHideHeader && <Header />}

      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/account" element={<MyAccountPage />} />
      </Routes>
    </>
  );
}

export default App;
