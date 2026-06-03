import { Navbar as BsNavbar, Nav, Container, Button } from "react-bootstrap";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import EntityAvatar from "./EntityAvatar";

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }) =>
    "nav-link" + (isActive ? " active" : "");

  return (
    <BsNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BsNavbar.Brand as={Link} to="/">
          Frets
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="main-nav" />

        <BsNavbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <NavLink to="/" end className={navLinkClass}>Piosenki</NavLink>
            <NavLink to="/artists" className={navLinkClass}>Artyści</NavLink>
            <NavLink to="/chords" className={navLinkClass}>Akordy</NavLink>
            <NavLink to="/tuner" className={navLinkClass}>Stroik</NavLink>
            <NavLink to="/drafts" className={navLinkClass}>Opracowania</NavLink>
          </Nav>

          <Nav className="align-items-center gap-2">
            {user ? (
              <>
                <Button
                  as={Link}
                  to="/songs/add"
                  variant="primary"
                  size="sm"
                >
                  <i className="bi bi-plus-lg me-1" />
                  Dodaj piosenkę
                </Button>

                <Link
                  to="/profile"
                  style={{
                    display: "inline-flex",
                    borderRadius: "50%",
                    padding: 2,
                    border: "2px solid transparent",
                    transition: "border-color 0.2s",
                  }}
                  className="navbar-avatar-link"
                  title={user.username}
                >
                  <EntityAvatar imageUrl={user.imageUrl} size={34} />
                </Link>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>Logowanie</NavLink>
                <NavLink to="/register" className={navLinkClass}>Rejestracja</NavLink>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;
