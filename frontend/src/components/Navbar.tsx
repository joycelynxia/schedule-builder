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
import "../styles/Navbar.css";

function Navbar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Hamburger button - only visible when collapsed */}
      <button 
        className="sidebar-toggle"
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
          <a href="/schedule" onClick={() => setIsExpanded(false)}>Schedule</a>
          <a href="/availability" onClick={() => setIsExpanded(false)}>Availability</a>
          <a href="/team" onClick={() => setIsExpanded(false)}>Team</a>
        </div>
        <div className="navbar-right">
          <a href="/account" onClick={() => setIsExpanded(false)}>My Account</a>
        </div>
      </nav>
    </>
  );
}

export default Navbar;