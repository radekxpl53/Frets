import { useEffect, useRef } from "react";
import { Button, Form } from "react-bootstrap";

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
}) {
  const textareaRef = useRef(null);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    autoResize(textareaRef.current);
  }, [value, versionType]);

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
      />
    </>
  );
}

export default VersionContentEditor;
