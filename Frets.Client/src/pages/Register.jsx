import { useState } from "react";
import { Link } from "react-router-dom";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(username, email, password);
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "string") {
        setError(data);
      } else if (data?.errors) {
        const messages = Object.values(data.errors).flat().join(" ");
        setError(messages);
      } else {
        setError("Rejestracja nie powiodła się.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: "400px" }} className="mt-5">
      <Card>
        <Card.Body>
          {success ? (
            <Alert variant="success" className="mb-0">
              Konto utworzone! Sprawdź swoją skrzynkę email i kliknij link
              potwierdzający, aby się zalogować.
            </Alert>
          ) : (
            <>
              <h3 className="mb-4 text-center">Rejestracja</h3>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Nazwa użytkownika</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Hasło</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Min. 8 znaków, wielka i mała litera, cyfra.
                  </Form.Text>
                </Form.Group>

                <Button type="submit" className="w-100" disabled={loading}>
                  {loading ? "Rejestracja..." : "Zarejestruj się"}
                </Button>
              </Form>

              <div className="text-center mt-3">
                Masz już konto? <Link to="/login">Zaloguj się</Link>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Register;