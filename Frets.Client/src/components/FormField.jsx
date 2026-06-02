import { Form } from "react-bootstrap";

function FormField({ label, htmlFor, error, hint, className, children }) {
  return (
    <Form.Group className={`mb-3 ${className ?? ""}`}>
      {label != null && <Form.Label htmlFor={htmlFor}>{label}</Form.Label>}
      {children}
      {error ? <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback> : null}
      {hint && !error ? <Form.Text className="text-muted">{hint}</Form.Text> : null}
    </Form.Group>
  );
}

export default FormField;
