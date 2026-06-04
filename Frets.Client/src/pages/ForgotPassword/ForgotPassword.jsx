import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import api from "../../api/client";
import FormField from "../../components/FormField";
import { useFormErrors } from "../../hooks/useFormErrors";
import { validateEmail } from "../../utils/validation";
import { usePageTitle } from "../../hooks/usePageTitle";

function ForgotPassword() {
  usePageTitle("Przypomnij hasło");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { clearErrors, setFieldError, getError, bindText, applyApiError } = useFormErrors();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError("email", emailError);
      setLoading(false);
      return;
    }

    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      if (!applyApiError(err)) {
        setFieldError("email", "Nie udało się wysłać linku. Spróbuj ponownie później.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: "400px" }} className="auth-screen">
      <Card>
        <Card.Body>
          <h3 className="mb-3 text-center">Przypomnij hasło</h3>
          <p className="text-muted small text-center mb-4">
            Podaj email powiązany z kontem. Wyślemy link do ustawienia nowego hasła.
          </p>

          {sent ? (
            <Alert variant="success">
              Jeśli konto z tym adresem istnieje, wysłaliśmy link resetujący (ważny 1 godzinę).
              Sprawdź skrzynkę i folder spam.
            </Alert>
          ) : (
            <Form onSubmit={handleSubmit} noValidate>
              <FormField label="Email" error={getError("email")}>
                <Form.Control
                  type="email"
                  {...bindText("email", email, setEmail)}
                  autoComplete="email"
                />
              </FormField>
              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? "Wysyłanie…" : "Wyślij link"}
              </Button>
            </Form>
          )}

          <div className="text-center mt-3">
            <Link to="/login">Wróć do logowania</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ForgotPassword;
