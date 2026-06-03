import { Button } from "react-bootstrap";

/**
 * Spójny pasek akcji administratora — używany w kartach piosenek i kartach poprawek.
 *
 * actions: Array<{ label, icon, variant, onClick }>
 * disabled: bool — blokuje wszystkie przyciski podczas ładowania
 */
export default function AdminActionBar({ actions = [], disabled = false }) {
  if (actions.length === 0) return null;

  return (
    <div
      className="d-flex align-items-center gap-2 mt-2 pt-2 border-top flex-wrap"
      style={{ borderColor: "#dee2e6" }}
    >
      <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
        <i className="bi bi-shield-lock" />
        Admin
      </span>
      <div className="d-flex gap-2 flex-wrap ms-1">
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant={action.variant}
            disabled={disabled}
            onClick={action.onClick}
          >
            {action.icon && <i className={`bi ${action.icon} me-1`} />}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
