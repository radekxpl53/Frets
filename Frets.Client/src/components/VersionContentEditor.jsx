import { useEffect, useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import VisualTabEditor, { parseAsciiToGrid } from "./VisualTabEditor";

const TAB_TEMPLATE = `e|----------------|
B|----------------|
G|----------------|
D|----------------|
A|----------------|
E|----------------|`;

function VersionContentEditor({
  versionType,
  value,
  onChange,
  rows = 8,
  required = false,
  showTabTools = true,
  placeholder,
  isInvalid = false,
  error,
}) {
  const textareaRef = useRef(null);
  
  const [mode, setMode] = useState(() => {
    if (versionType !== "tab") return "text";
    if (!value || !value.trim()) return "visual";
    const parsed = parseAsciiToGrid(value);
    return parsed.length > 0 ? "visual" : "text";
  });

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (mode === "text") {
      autoResize(textareaRef.current);
    }
  }, [value, versionType, mode]);

  const insertIntoTab = (textToInsert) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${textToInsert}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    const next = `${value.slice(0, start)}${textToInsert}${value.slice(end)}`;
    const nextPos = start + textToInsert.length;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const isTab = versionType === "tab";

  return (
    <>
      {isTab && (
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <span className="small fw-semibold text-muted">Tryb edycji tabulatury:</span>
          <div className="btn-group" role="group">
            <Button
              type="button"
              size="sm"
              variant={mode === "visual" ? "primary" : "outline-primary"}
              onClick={() => {
                const parsed = parseAsciiToGrid(value);
                if (value.trim() && parsed.length === 0) {
                  alert("Nie można przełączyć na edytor wizualny. Treść zawiera niestandardowy tekst.");
                  return;
                }
                setMode("visual");
              }}
            >
              Wizualny
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "text" ? "primary" : "outline-primary"}
              onClick={() => setMode("text")}
            >
              Tekstowy
            </Button>
          </div>
        </div>
      )}

      {isTab && mode === "visual" ? (
        <VisualTabEditor value={value} onChange={onChange} />
      ) : (
        <>
          {isTab && showTabTools && (
            <div className="d-flex gap-2 flex-wrap mb-2">
              <Button type="button" size="sm" variant="outline-secondary" onClick={() => onChange(TAB_TEMPLATE)}>
                Szablon 6 strun
              </Button>
              <Button type="button" size="sm" variant="outline-secondary" onClick={() => insertIntoTab("|----------------|")}>
                Wstaw takt
              </Button>
              <Button type="button" size="sm" variant="outline-secondary" onClick={() => insertIntoTab("-")}>
                Wstaw "-"
              </Button>
              <Button type="button" size="sm" variant="outline-secondary" onClick={() => insertIntoTab("\n")}>
                Nowa linia
              </Button>
            </div>
          )}

          <Form.Control
            ref={textareaRef}
            as="textarea"
            rows={rows}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              autoResize(e.target);
            }}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
              fontSize: "14px",
              lineHeight: "1.45",
              resize: "none",
              overflow: "hidden",
              minHeight: isTab ? "240px" : "220px",
            }}
            placeholder={placeholder ?? (isTab ? TAB_TEMPLATE : "Wprowadź treść wersji...")}
            required={required}
            isInvalid={isInvalid}
          />
        </>
      )}
      {error ? <Form.Control.Feedback type="invalid" className="d-block">{error}</Form.Control.Feedback> : null}
    </>
  );
}

export default VersionContentEditor;
