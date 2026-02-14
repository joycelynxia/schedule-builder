import { NavLink } from "react-router-dom";
import "../styles/Navbar.css";
import { FaRegCalendarAlt } from "react-icons/fa";
import { MdFreeCancellation } from "react-icons/md";
import { IoSwapHorizontal } from "react-icons/io5";
import { RiTeamFill } from "react-icons/ri";
import { FaMoneyBillWave } from "react-icons/fa";
import { FaRegUser } from "react-icons/fa";

function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

  return (
    <nav className="navbar">
        <div className="navbar-left">
          <a href="/schedule" className="logo">
            Schedulr
          </a>
        </div>
        <div className="navbar-center">
          <NavLink 
            to="/schedule" 
            className={linkClass}
          >
            <FaRegCalendarAlt /><span className="nav-label">Schedule</span>
          </NavLink>
          <NavLink 
            to="/availability" 
            className={linkClass}
          >
            <MdFreeCancellation /><span className="nav-label">My Availability</span>
          </NavLink>
          <NavLink 
            to="/swap-requests" 
            className={linkClass}
          >
            <IoSwapHorizontal /><span className="nav-label">Swap Requests</span>
          </NavLink>
          <NavLink 
            to="/available-shifts" 
            className={linkClass}
          >
            <FaMoneyBillWave /><span className="nav-label">Available Shifts</span>
          </NavLink>
          <NavLink 
            to="/team" 
            className={linkClass}
          >
            <RiTeamFill /><span className="nav-label">Team</span>
          </NavLink>
        </div>
        <div className="navbar-right">
          <NavLink 
            to="/account" 
            className={linkClass}
          >
            <FaRegUser /><span className="nav-label">My Account</span>
          </NavLink>
        </div>
    </nav>
  );
}

export default Navbar;