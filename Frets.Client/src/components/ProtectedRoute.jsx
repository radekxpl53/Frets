import { Navigate } from "react-router-dom";
import { Spinner, Container } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { isAdminUser } from "../utils/apiError";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;