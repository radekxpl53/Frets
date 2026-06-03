/** Spójny nagłówek strony: tytuł + opcjonalny podtytuł + opcjonalne akcje po prawej. */
function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <h2 className="mb-0">{title}</h2>
        {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
      </div>
      {subtitle && <p className="text-muted mb-0 mt-2">{subtitle}</p>}
    </div>
  );
}

export default PageHeader;
