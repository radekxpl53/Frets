import { Navbar as BsNavbar, Nav, Container, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <BsNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BsNavbar.Brand as={Link} to="/">
          Frets
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="main-nav" />

        <BsNavbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              Piosenki
            </Nav.Link>
            <Nav.Link as={Link} to="/artists">
              Artyści
            </Nav.Link>
            <Nav.Link as={Link} to="/chords">
              Akordy
            </Nav.Link>
            <Nav.Link as={Link} to="/tuner">
              Stroik
            </Nav.Link>
            <Nav.Link as={Link} to="/drafts">
              Opracowania
            </Nav.Link>
          </Nav>

          <Nav>
            {user ? (
              <>
                <Nav.Link as={Link} to="/songs/add">
                  Dodaj piosenkę
                </Nav.Link>
                <Nav.Link as={Link} to="/profile">
                  {user.username} ({user.level} lvl)
                </Nav.Link>
                {user.role === "admin" && (
                  <Nav.Link as={Link} to="/admin">
                    Admin
                  </Nav.Link>
                )}
                <Button variant="outline-light" size="sm" onClick={handleLogout} className="ms-2">
                  Wyloguj
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">
                  Logowanie
                </Nav.Link>
                <Nav.Link as={Link} to="/register">
                  Rejestracja
                </Nav.Link>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;