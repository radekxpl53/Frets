import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Container, Card, Alert, Spinner } from "react-bootstrap";
import api from "../api/client";

function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    api
      .post("/auth/confirm-email", { token })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  return (
    <Container style={{ maxWidth: "400px" }} className="mt-5">
      <Card>
        <Card.Body className="text-center">
          {status === "loading" && (
            <>
              <Spinner animation="border" className="mb-3" />
              <p>Potwierdzanie adresu email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <Alert variant="success">
                Email potwierdzony! Możesz się teraz zalogować.
              </Alert>
              <Link to="/login" className="btn btn-primary">
                Przejdź do logowania
              </Link>
            </>
          )}

          {status === "error" && (
            <Alert variant="danger" className="mb-0">
              Link jest nieprawidłowy lub wygasł.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ConfirmEmail;