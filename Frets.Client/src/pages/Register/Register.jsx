import { useState } from "react";
import { Link } from "react-router-dom";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import FormField from "../../components/FormField";
import { useFormErrors } from "../../hooks/useFormErrors";
import { parseApiValidationError } from "../../utils/formErrors";
import { validateEmail, validatePassword, validateUsername } from "../../utils/validation";
import { usePageTitle } from "../../hooks/usePageTitle";

function Register() {
  usePageTitle("Rejestracja");
  const { register } = useAuth();
  const { clearErrors, setFieldError, setFieldErrors, getError, applyApiError, bindText } =
    useFormErrors();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const nextErrors = {};
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (usernameError) nextErrors.username = usernameError;
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    try {
      await register(username.trim(), email.trim(), password);
      setSuccess(true);
    } catch (err) {
      if (!applyApiError(err)) {
        const { message } = parseApiValidationError(err);
        setFieldError("username", message ?? "Rejestracja nie powiodła się.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: "400px" }} className="auth-screen">
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

              <Form onSubmit={handleSubmit} noValidate>
                <FormField label="Nazwa użytkownika" error={getError("username")}>
                  <Form.Control type="text" {...bindText("username", username, setUsername)} />
                </FormField>

                <FormField label="Email" error={getError("email")}>
                  <Form.Control type="email" {...bindText("email", email, setEmail)} autoComplete="email" />
                </FormField>

                <FormField
                  label="Hasło"
                  error={getError("password")}
                  hint="Min. 8 znaków, wielka i mała litera, cyfra."
                >
                  <Form.Control
                    type="password"
                    {...bindText("password", password, setPassword)}
                    autoComplete="new-password"
                  />
                </FormField>

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
