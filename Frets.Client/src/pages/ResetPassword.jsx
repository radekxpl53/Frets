import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import api from "../api/client";
import FormField from "../components/FormField";
import { useFormErrors } from "../hooks/useFormErrors";
import { PASSWORD_MESSAGES, validatePassword } from "../utils/validation";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { clearErrors, setFieldErrors, getError, bindText, applyApiError } = useFormErrors();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const nextErrors = {};
    const passwordError = validatePassword(password);
    if (passwordError) nextErrors.password = passwordError;
    if (password !== confirmPassword) nextErrors.confirmPassword = PASSWORD_MESSAGES.mismatch;

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "string" && data.toLowerCase().includes("token")) {
        setFieldErrors({ password: "Link jest nieprawidłowy lub wygasł. Poproś o nowy." });
      } else if (!applyApiError(err)) {
        setFieldErrors({ password: "Nie udało się zmienić hasła." });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Container style={{ maxWidth: "400px" }} className="mt-5">
        <Card>
          <Card.Body>
            <Alert variant="danger" className="mb-0">
              Brak tokenu w linku. Użyj adresu z wiadomości email lub{" "}
              <Link to="/forgot-password">poproś o nowy link</Link>.
            </Alert>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container style={{ maxWidth: "400px" }} className="mt-5">
      <Card>
        <Card.Body>
          <h3 className="mb-4 text-center">Nowe hasło</h3>

          {success ? (
            <>
              <Alert variant="success">Hasło zostało zmienione. Możesz się zalogować.</Alert>
              <Link to="/login" className="btn btn-primary w-100">
                Przejdź do logowania
              </Link>
            </>
          ) : (
            <Form onSubmit={handleSubmit} noValidate>
              <FormField
                label="Nowe hasło"
                error={getError("password")}
                hint="Min. 8 znaków, wielka i mała litera oraz cyfra."
              >
                <Form.Control
                  type="password"
                  {...bindText("password", password, setPassword)}
                  autoComplete="new-password"
                />
              </FormField>

              <FormField label="Powtórz hasło" error={getError("confirmPassword")}>
                <Form.Control
                  type="password"
                  {...bindText("confirmPassword", confirmPassword, setConfirmPassword)}
                  autoComplete="new-password"
                />
              </FormField>

              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? "Zapisywanie…" : "Ustaw hasło"}
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ResetPassword;
