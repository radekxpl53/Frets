import { Component } from "react";
import { Alert, Button, Container } from "react-bootstrap";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Nieobsłużony błąd UI:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="mt-5" style={{ maxWidth: "640px" }}>
          <Alert variant="danger">
            <Alert.Heading>Coś poszło nie tak</Alert.Heading>
            <p className="mb-3">
              Wystąpił nieoczekiwany błąd na tej stronie. Spróbuj wrócić na stronę
              główną lub odświeżyć.
            </p>
            <div className="d-flex gap-2">
              <Button variant="primary" href="/" onClick={this.handleReset}>
                Strona główna
              </Button>
              <Button variant="outline-secondary" onClick={() => window.location.reload()}>
                Odśwież
              </Button>
            </div>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
