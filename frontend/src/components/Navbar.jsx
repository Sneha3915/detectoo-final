import { Link, useLocation } from "react-router-dom";

export default function Navbar() {

  const location = useLocation();

  return (

    <nav className="navbar">

      <div className="logo">
        DETECTOO
      </div>

      <div className="nav-links">

        <Link
          to="/"
          className={
            location.pathname === "/"
              ? "active"
              : ""
          }
        >
          HOME
        </Link>

        <Link
          to="/detector"
          className={
            location.pathname === "/detector"
              ? "active"
              : ""
          }
        >
          DETECTOR
        </Link>

        <Link
          to="/about"
          className={
            location.pathname === "/about"
              ? "active"
              : ""
          }
        >
          ABOUT
        </Link>

      </div>

    </nav>
  );
}