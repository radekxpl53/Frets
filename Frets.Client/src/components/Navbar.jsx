import { Navbar as BsNavbar, Nav, Container, Button } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // NavLink dodaje klasę "active" automatycznie gdy ścieżka pasuje
  const navLinkClass = ({ isActive }) =>
    "nav-link" + (isActive ? " active" : "");

  return (
    <BsNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BsNavbar.Brand as={NavLink} to="/">
          Frets
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="main-nav" />

        <BsNavbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <NavLink to="/" end className={navLinkClass}>
              Piosenki
            </NavLink>
            <NavLink to="/artists" className={navLinkClass}>
              Artyści
            </NavLink>
            <NavLink to="/chords" className={navLinkClass}>
              Akordy
            </NavLink>
            <NavLink to="/tuner" className={navLinkClass}>
              Stroik
            </NavLink>
            <NavLink to="/drafts" className={navLinkClass}>
              Opracowania
            </NavLink>
          </Nav>

          <Nav>
            {user ? (
              <>
                <NavLink to="/songs/add" className={navLinkClass}>
                  Dodaj piosenkę
                </NavLink>
                <NavLink to="/profile" className={navLinkClass}>
                  {user.username} ({user.level} lvl)
                </NavLink>
                {user.role === "admin" && (
                  <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                )}
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleLogout}
                  className="ms-2"
                >
                  Wyloguj
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Logowanie
                </NavLink>
                <NavLink to="/register" className={navLinkClass}>
                  Rejestracja
                </NavLink>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;
