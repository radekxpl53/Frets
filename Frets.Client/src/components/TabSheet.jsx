import React from "react";

function TabSheet({ content }) {
  if (!content) return <div className="text-muted">Brak treści.</div>;

  let data;
  try {
    data = JSON.parse(content);
  } catch {
    // Fallback if not valid JSON: render as raw text
    return (
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "14px" }}>
        {content}
      </pre>
    );
  }

  // Fallback if it is JSON but not in the tab sections format.
  // Starsze tabulatury miały format { type, ascii, measures } — pokaż pole ascii,
  // a nie surowy obiekt JSON.
  if (!data.sections || data.sections.length === 0) {
    const fallbackText = typeof data.ascii === "string" ? data.ascii : content;
    return (
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "14px" }}>
        {fallbackText}
      </pre>
    );
  }

  const sectionLabel = (type) => {
    const labels = {
      verse: "Zwrotka",
      chorus: "Refren",
      bridge: "Bridge",
      intro: "Intro",
      outro: "Outro",
    };
    return labels[type] || type;
  };

  return (
    <div style={{ fontFamily: "monospace", fontSize: "14px" }} className="tab-sheet">
      {data.sections.map((section, si) => (
        <div key={si} className="mb-4">
          <div className="fw-bold text-primary mb-2">
            {section.label || sectionLabel(section.type)}
          </div>
          <div style={{ whiteSpace: "pre", overflowX: "auto", lineHeight: "1.25" }}>
            {section.lines.map((line, li) => {
              const endsWithBar = line.notation.endsWith("|");
              return (
                <div key={li}>
                  {line.string}|{line.notation}{endsWithBar ? "" : "|"}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TabSheet;
