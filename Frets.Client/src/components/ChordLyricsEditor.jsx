import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import {
  buildHighlightedEditorHtml,
  createChordSet,
  getChordAutocompleteState,
  getChordEditorStats,
} from "../utils/chordEditorUtils";

function ChordLyricsEditor({
  value,
  onChange,
  allChords = [],
  showSectionButtons = true,
  required = false,
  placeholder = "Przykład:\nAm   F   C   G\nTo jest moja linia tekstu\n\nC   G\nNastępna linia",
  isInvalid = false,
  error,
}) {
  const [cursorPos, setCursorPos] = useState(0);
  const chordTextareaRef = useRef(null);
  const chordOverlayRef = useRef(null);

  const chordSet = useMemo(() => createChordSet(allChords), [allChords]);

  const autoResizeTextarea = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    autoResizeTextarea(chordTextareaRef.current);
  }, [value]);

  const chordEditorStats = useMemo(() => getChordEditorStats(value, chordSet), [value, chordSet]);
  const hasMixedChordLines = chordEditorStats.mixedLines > 0;

  const chordAutocompleteState = useMemo(
    () => getChordAutocompleteState(value, cursorPos, allChords),
    [allChords, value, cursorPos]
  );
  const chordAutocomplete = chordAutocompleteState.suggestions;

  const highlightedEditorHtml = useMemo(
    () => buildHighlightedEditorHtml(value, chordSet),
    [value, chordSet]
  );

  const applyChordSuggestion = (suggestion) => {
    if (!chordTextareaRef.current) return;
    const el = chordTextareaRef.current;
    const end = el.selectionEnd ?? cursorPos;
    const tokenStart = chordAutocompleteState.tokenStart;
    if (tokenStart < 0) return;
    const right = value.slice(end);
    const nextText = `${value.slice(0, tokenStart)}${suggestion}${right}`;
    onChange(nextText);

    const nextPos = tokenStart + suggestion.length;
    setCursorPos(nextPos);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
      autoResizeTextarea(el);
    });
  };

  const insertSectionHeader = (label) => {
    const el = chordTextareaRef.current;
    if (!el) {
      onChange(`${value}\n[${label}]`.trim());
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before.endsWith("\n") || before.length === 0 ? "" : "\n";
    const insertion = `${prefix}[${label}]\n`;
    const nextText = `${before}${insertion}${after}`;
    onChange(nextText);
    const nextPos = before.length + insertion.length;
    setCursorPos(nextPos);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
      autoResizeTextarea(el);
    });
  };

  return (
    <>
      {showSectionButtons && (
        <div className="mb-2 d-flex gap-2 flex-wrap">
          <Button size="sm" variant="outline-secondary" type="button" onClick={() => insertSectionHeader("Zwrotka")}>
            + Zwrotka
          </Button>
          <Button size="sm" variant="outline-secondary" type="button" onClick={() => insertSectionHeader("Refren")}>
            + Refren
          </Button>
          <Button size="sm" variant="outline-secondary" type="button" onClick={() => insertSectionHeader("Bridge")}>
            + Bridge
          </Button>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <Form.Control
          ref={chordTextareaRef}
          as="textarea"
          rows={12}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setCursorPos(e.target.selectionStart ?? 0);
            autoResizeTextarea(e.target);
            if (chordOverlayRef.current) {
              chordOverlayRef.current.scrollTop = e.target.scrollTop;
            }
          }}
          onClick={(e) => setCursorPos(e.target.selectionStart ?? 0)}
          onKeyUp={(e) => setCursorPos(e.target.selectionStart ?? 0)}
          onScroll={(e) => {
            if (chordOverlayRef.current) {
              chordOverlayRef.current.scrollTop = e.target.scrollTop;
              chordOverlayRef.current.scrollLeft = e.target.scrollLeft;
            }
          }}
          style={{
            fontFamily: "monospace",
            position: "relative",
            background: "transparent",
            color: "transparent",
            caretColor: "#212529",
            zIndex: 2,
            resize: "none",
            overflow: "hidden",
            minHeight: "280px",
          }}
          placeholder={placeholder}
          required={required}
          isInvalid={isInvalid}
        />
        <div
          ref={chordOverlayRef}
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: "0.375rem 0.75rem",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            pointerEvents: "none",
            border: `1px solid ${isInvalid ? "var(--bs-form-invalid-border-color, #dc3545)" : "#ced4da"}`,
            borderRadius: "0.375rem",
            backgroundColor: "#fff",
            lineHeight: "1.5",
          }}
          dangerouslySetInnerHTML={{ __html: `${highlightedEditorHtml || "&nbsp;"}\n` }}
        />
      </div>
      {chordAutocomplete.length > 0 && (
        <div className="border rounded mt-2 p-2 bg-light">
          <div className="small text-muted mb-1">Podpowiedzi akordów (kliknij, aby wstawić)</div>
          <div className="d-flex flex-wrap gap-2">
            {chordAutocomplete.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                size="sm"
                variant="outline-primary"
                onClick={() => applyChordSuggestion(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
      {hasMixedChordLines && (
        <Alert variant="warning" className="mt-2 mb-0 py-2">
          Wykryto linie mieszane (tekst + akordy). Takie linie są traktowane jako zwykły tekst.
        </Alert>
      )}
      {error ? <Form.Control.Feedback type="invalid" className="d-block">{error}</Form.Control.Feedback> : null}
      <Form.Text className="text-muted">
        Jeśli linia zawiera rozpoznane akordy, traktujemy ją jako linię akordów dla następnej linii tekstu.
      </Form.Text>
    </>
  );
}

export default ChordLyricsEditor;
