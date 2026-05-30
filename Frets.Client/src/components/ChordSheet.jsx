function ChordSheet({ content }) {
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    return <p className="text-danger">Nie udało się odczytać akordów.</p>;
  }

  if (!data.sections || data.sections.length === 0) {
    return <p className="text-muted">Brak treści.</p>;
  }

  const buildChordLine = (chords) => {
    if (!chords || chords.length === 0) return "";

    const sorted = [...chords].sort((a, b) => a.offset - b.offset);

    let line = "";
    for (const c of sorted) {
      if (line.length < c.offset) {
        line += " ".repeat(c.offset - line.length);
      }
      line += c.chord;
    }
    return line;
  };

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
    <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
      {data.sections.map((section, si) => (
        <div key={si} className="mb-4">
          <div className="fw-bold text-primary mb-2">
            {section.label || sectionLabel(section.type)}
          </div>
          {section.lines.map((line, li) => (
            <div key={li} className="mb-2">
              <div style={{ whiteSpace: "pre", color: "#0d6efd", fontWeight: "bold" }}>
                {buildChordLine(line.chords)}
              </div>
              <div style={{ whiteSpace: "pre" }}>{line.lyrics}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default ChordSheet;