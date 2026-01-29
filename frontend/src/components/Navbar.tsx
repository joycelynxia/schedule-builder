// import "../styles/Navbar.css"

// function Navbar() {
//   return (
//     <nav className="navbar">
//       <div className="navbar-top">
//         <a href="/schedule" className="logo">
//           Schedulr
//         </a>
//       </div>
//       <div className="navbar-middle">
//         {/* <ul className="nav-links"> */}
//           <a href="/schedule">Schedule</a>
//           <a href="/availability">Availability</a>
//           <a href="/team">Team</a>
//         {/* </ul> */}
//       </div>
//       <div className="navbar-bottom">
//         <a href="/account">My Account</a>
//       </div>
//     </nav>
//   );
// }

// export default Navbar;

import { useState } from "react";
import { NavLink } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

  return (
    <>
      {/* Hamburger button - only visible when collapsed */}
      <button 
        className={`sidebar-toggle ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle sidebar"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay for mobile */}
      {isExpanded && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <nav className={`navbar ${isExpanded ? 'expanded' : ''}`}>
        <div className="navbar-left">
          <a href="/schedule" className="logo">
            Schedulr
          </a>
        </div>
        <div className="navbar-center">
          <NavLink 
            to="/schedule" 
            onClick={() => setIsExpanded(false)}
            className={linkClass}
          >
            Schedule
          </NavLink>
          <NavLink 
            to="/availability" 
            onClick={() => setIsExpanded(false)}
            className={linkClass}
          >
            My Availability
          </NavLink>

          <NavLink 
            to="/swap-requests" 
            onClick={() => setIsExpanded(false)}
            className={linkClass}
          >
            Swap Requests
          </NavLink>
          <NavLink 
            to="/available-shifts" 
            onClick={() => setIsExpanded(false)}
            className={linkClass}
          >
            Available Shifts
          </NavLink>
          <NavLink 
            to="/team" 
            onClick={() => setIsExpanded(false)}
            className={linkClass}
          >
            Team
          </NavLink>
        </div>
        <div className="navbar-right">
          <NavLink 
            to="/account" 
            onClick={() => setIsExpanded(false)}
            className={linkClass}
          >
            My Account
          </NavLink>
        </div>
      </nav>
    </>
  );
}

export default Navbar;