import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Form, Button, Card } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import FormField from "../../components/FormField";
import { useFormErrors } from "../../hooks/useFormErrors";
import { translateApiMessage } from "../../utils/formErrors";
import { validateRequired } from "../../utils/validation";
import { usePageTitle } from "../../hooks/usePageTitle";

function Login() {
  usePageTitle("Logowanie");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { clearErrors, setFieldErrors, getError, bindText } = useFormErrors();

  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const nextErrors = {};
    const loginError = validateRequired(loginValue, "Podaj email lub nazwę użytkownika.");
    const passwordError = validateRequired(password, "Podaj hasło.");
    if (loginError) nextErrors.login = loginError;
    if (passwordError) nextErrors.password = passwordError;

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    try {
      await login(loginValue, password);
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      const message =
        typeof data === "string"
          ? translateApiMessage(data)
          : "Nieprawidłowy email, nazwa użytkownika lub hasło.";
      setFieldErrors({
        login: message,
        password: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: "400px" }} className="auth-screen">
      <Card>
        <Card.Body>
          <h3 className="mb-4 text-center">Logowanie</h3>

          <Form onSubmit={handleSubmit} noValidate>
            <FormField label="Email lub nazwa użytkownika" error={getError("login")}>
              <Form.Control
                type="text"
                {...bindText("login", loginValue, setLoginValue)}
                autoComplete="username"
              />
            </FormField>

            <FormField label="Hasło" error={getError("password")}>
              <Form.Control
                type="password"
                {...bindText("password", password, setPassword)}
                autoComplete="current-password"
              />
            </FormField>

            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Link to="/forgot-password">Zapomniałeś hasła?</Link>
          </div>
          <div className="text-center mt-2">
            Nie masz konta? <Link to="/register">Zarejestruj się</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;
