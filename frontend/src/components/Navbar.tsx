import React from "react";
import "../styles/Navbar.css"

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <a href="/schedule" className="logo">
          SoBol
        </a>
      </div>
      <div className="navbar-center">
        {/* <ul className="nav-links"> */}
          <a href="/schedule">Schedule</a>
          <a href="/availability">Availability</a>
        {/* </ul> */}
      </div>
      <div className="navbar-right">
        <a href="/account">My Account</a>
      </div>
    </nav>
  );
}

export default Navbar;
