/** Spójny pusty stan: ikona + tytuł + opcjonalna treść (np. przycisk). */
function EmptyState({ icon = "bi-inbox", title, children }) {
  return (
    <div className="text-center text-muted py-5">
      <i className={`bi ${icon}`} style={{ fontSize: "2.5rem", opacity: 0.45 }} />
      <p className="mt-3 mb-2">{title}</p>
      {children}
    </div>
  );
}

export default EmptyState;
