import { useState, useEffect, useRef } from "react";
import { Button } from "react-bootstrap";

const DEFAULT_COLS = 16;
const STRINGS = ["e", "B", "G", "D", "A", "E"];
const START_COLS = 8;

// ─── ASCII <-> siatka (zachowane dla zgodności / wykrywania trybu) ──────────

export const serializeGridToAscii = (measures) => {
  if (!measures || measures.length === 0) return "";
  const lines = [];

  measures.forEach((measure) => {
    const cols = measure[0].length;
    const colWidths = Array(cols).fill(1);
    for (let c = 0; c < cols; c++) {
      let maxLen = 1;
      for (let s = 0; s < 6; s++) {
        if (measure[s][c] && measure[s][c].length > maxLen) maxLen = measure[s][c].length;
      }
      colWidths[c] = maxLen;
    }

    const measureLines = STRINGS.map((strLabel, s) => {
      let strLine = `${strLabel}|-`;
      for (let c = 0; c < cols; c++) {
        const val = measure[s][c] || "";
        const width = colWidths[c];
        if (val) {
          strLine += val;
          if (val.length < width) strLine += "-".repeat(width - val.length);
        } else {
          strLine += "-".repeat(width);
        }
        if (c < cols - 1) strLine += "-";
      }
      strLine += "-|";
      return strLine;
    });

    lines.push(measureLines.join("\n"));
  });

  return lines.join("\n\n");
};

export const parseAsciiToGrid = (asciiText) => {
  if (!asciiText || !asciiText.trim()) return [];

  const lines = asciiText.split("\n").map((l) => l.trim()).filter(Boolean);
  const measures = [];

  let i = 0;
  while (i <= lines.length - 6) {
    const sub = lines.slice(i, i + 6);
    const isTabBlock = sub.every((line) => /^\s*[a-gA-G]?\s*\|/.test(line));

    if (isTabBlock) {
      const strings = sub.map((line) => {
        const match = line.match(/^\s*[a-gA-G]?\s*\|(.*)/);
        let content = match ? match[1] : line;
        if (content.endsWith("|")) content = content.slice(0, -1);
        if (content.startsWith("-")) content = content.slice(1);
        if (content.endsWith("-")) content = content.slice(0, -1);
        return content;
      });

      const maxLen = Math.max(...strings.map((s) => s.length));
      const parsedColumns = Array.from({ length: 6 }, () => []);
      let charIdx = 0;

      while (charIdx < maxLen) {
        let width = 1;
        for (let s = 0; s < 6; s++) {
          const char = strings[s][charIdx] ?? "-";
          const nextChar = strings[s][charIdx + 1] ?? "";
          if (/\d/.test(char) && /\d/.test(nextChar)) width = 2;
        }
        for (let s = 0; s < 6; s++) {
          const part = (strings[s] ?? "").slice(charIdx, charIdx + width);
          const val = part.replace(/-+/g, "");
          parsedColumns[s].push(val || "");
        }
        charIdx += width;
        let allDashes = true;
        for (let s = 0; s < 6; s++) {
          if (strings[s][charIdx] !== "-") allDashes = false;
        }
        if (allDashes && charIdx < maxLen) charIdx += 1;
      }

      const colCount = Math.max(DEFAULT_COLS, parsedColumns[0].length);
      const paddedMeasure = Array.from({ length: 6 }, (_, s) => {
        const arr = [...parsedColumns[s]];
        while (arr.length < colCount) arr.push("");
        return arr;
      });

      measures.push(paddedMeasure);
      i += 6;
    } else {
      i += 1;
    }
  }

  return measures;
};

// ─── Model kolumnowy (ciągły tab, kreski taktu i sekcje) ────────────────────

const emptyCells = () => ["", "", "", "", "", ""];
const makeNoteCol = () => ({ bar: false, cells: emptyCells() });
const cloneCols = (cols) =>
  cols.map((c) =>
    c.bar ? { bar: true } : c.section ? { section: true } : { bar: false, cells: [...c.cells] }
  );
const startCols = () => Array.from({ length: START_COLS }, makeNoteCol);

const isNoteCol = (c) => c && !c.bar && !c.section;

const nextNoteCol = (cols, from) => {
  for (let c = from + 1; c < cols.length; c++) if (isNoteCol(cols[c])) return c;
  return -1;
};
const prevNoteCol = (cols, from) => {
  for (let c = from - 1; c >= 0; c--) if (isNoteCol(cols[c])) return c;
  return -1;
};

// Podział kolumn na sekcje (markery {section:true}) — zachowuje indeksy płaskiej tablicy.
function splitSections(cols) {
  const groups = [];
  let cur = [];
  cols.forEach((col, index) => {
    if (col.section) {
      groups.push(cur);
      cur = [];
    } else {
      cur.push({ col, index });
    }
  });
  groups.push(cur);
  return groups;
}

function asciiToColumns(value) {
  const measures = parseAsciiToGrid(value);
  const cols = [];
  measures.forEach((m, mi) => {
    if (mi > 0) cols.push({ section: true }); // osobne bloki = osobne sekcje
    const n = m[0].length;
    for (let c = 0; c < n; c++) {
      const cells = m.map((s) => s[c] ?? "");
      if (cells.every((v) => v === "|")) cols.push({ bar: true });
      else cols.push({ bar: false, cells });
    }
  });
  // przytnij końcowe puste kolumny nutowe (żeby nie było pustego ogona)
  while (cols.length > 1) {
    const last = cols[cols.length - 1];
    if (isNoteCol(last) && last.cells.every((v) => v === "")) cols.pop();
    else break;
  }
  return cols.length ? cols : startCols();
}

function blockToAscii(blockCols) {
  const widths = blockCols.map((col) =>
    col.bar ? 1 : Math.max(1, ...col.cells.map((v) => (v || "").length))
  );
  return STRINGS.map((label, si) => {
    let line = `${label}|`;
    blockCols.forEach((col, ci) => {
      if (col.bar) {
        line += "|";
      } else {
        const tok = col.cells[si] || "-";
        line += `-${tok}${"-".repeat(widths[ci] - tok.length)}`;
      }
    });
    line += "-|";
    return line;
  }).join("\n");
}

function columnsToAscii(cols) {
  // Sekcje → osobne bloki rozdzielone pustą linią (buildTabJsonFromAscii zrobi z nich sekcje).
  const groups = [[]];
  cols.forEach((c) => {
    if (c.section) groups.push([]);
    else groups[groups.length - 1].push(c);
  });
  return groups
    .filter((g) => g.length > 0)
    .map(blockToAscii)
    .join("\n\n");
}

// ─── Komponent ──────────────────────────────────────────────────────────────

function VisualTabEditor({ value, onChange }) {
  const [cols, setCols] = useState(() => asciiToColumns(value));
  const [active, setActive] = useState(null); // { col, str }
  const containerRef = useRef(null);
  const lastEmitted = useRef(undefined);

  const commit = (nextCols) => {
    const ascii = columnsToAscii(nextCols);
    lastEmitted.current = ascii;
    setCols(nextCols);
    onChange?.(ascii);
  };

  // Synchronizacja z `value` przy zmianie z ZEWNĄTRZ (np. wczytanie treści do
  // poprawki, restore wersji roboczej, wyczyszczenie). Pomija własne zmiany
  // (lastEmitted), więc nie resetuje kursora podczas pisania.
  useEffect(() => {
    const incoming = value ?? "";
    if (incoming !== (lastEmitted.current ?? "")) {
      setCols(asciiToColumns(incoming));
      setActive(null);
      lastEmitted.current = incoming;
    }
  }, [value]);

  const focusSelf = () => containerRef.current?.focus();

  const clickCell = (col, str, e) => {
    e.stopPropagation();
    setActive({ col, str });
    focusSelf();
  };

  const handleKeyDown = (e) => {
    if (!active) return;
    const { col, str } = active;
    if (col >= cols.length || !isNoteCol(cols[col])) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (str > 0) setActive({ col, str: str - 1 });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (str < 5) setActive({ col, str: str + 1 });
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const p = prevNoteCol(cols, col);
      if (p >= 0) setActive({ col: p, str });
      return;
    }
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      let n = nextNoteCol(cols, col);
      if (n < 0) {
        const next = [...cloneCols(cols), makeNoteCol()];
        n = next.length - 1;
        commit(next);
      }
      setActive({ col: n, str });
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const next = cloneCols(cols);
      const prev = next[col].cells[str];
      let v = e.key;
      if (prev && /^[0-9]$/.test(prev)) {
        const combined = prev + e.key;
        if (parseInt(combined, 10) <= 24) v = combined;
      }
      next[col].cells[str] = v;
      let target = nextNoteCol(next, col);
      if (target < 0) {
        next.push(makeNoteCol());
        target = next.length - 1;
      }
      commit(next);
      setActive({ col: target, str });
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const next = cloneCols(cols);
      next[col].cells[str] = "";
      commit(next);
      if (e.key === "Backspace") {
        const p = prevNoteCol(next, col);
        if (p >= 0) setActive({ col: p, str });
      }
      return;
    }
  };

  // Wstawia kreskę taktu / sekcję w bieżącej kolumnie (przed aktywną), żeby nie
  // tworzyć dodatkowej pustej przerwy na końcu. Bez aktywnej komórki — dokleja na końcu.
  const insertMarkerAtActive = (marker) => {
    const next = cloneCols(cols);
    if (!active) {
      next.push(marker, makeNoteCol());
      commit(next);
      setActive({ col: next.length - 1, str: 0 });
      focusSelf();
      return;
    }
    const { col, str } = active;
    next.splice(col, 0, marker);
    const target = col + 1; // dawna aktywna kolumna, teraz za kreską
    if (target >= next.length || !isNoteCol(next[target])) {
      next.splice(target, 0, makeNoteCol());
    }
    commit(next);
    setActive({ col: target, str });
    focusSelf();
  };

  const endMeasure = () => insertMarkerAtActive({ bar: true });
  const newSection = () => insertMarkerAtActive({ section: true });

  const removeLastColumn = () => {
    if (cols.length <= 1) return;
    const next = cloneCols(cols).slice(0, -1);
    commit(next);
    setActive(null);
  };

  const clearAll = () => {
    const init = startCols();
    commit(init);
    setActive(null);
  };

  const sections = splitSections(cols);

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} style={{ outline: "none" }}>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
        <Button size="sm" variant="primary" type="button" onClick={endMeasure}>
          <i className="bi bi-distribute-vertical me-1" />
          Zakończ takt |
        </Button>
        <Button size="sm" variant="outline-primary" type="button" onClick={newSection}>
          <i className="bi bi-plus-square me-1" />
          Nowa sekcja
        </Button>
        <Button size="sm" variant="outline-secondary" type="button" onClick={removeLastColumn}>
          Usuń ostatnią kolumnę
        </Button>
        <Button size="sm" variant="outline-danger" type="button" onClick={clearAll}>
          Wyczyść
        </Button>
        <span className="small text-muted ms-auto">
          Kliknij pole i wpisuj progi (0–24). Spacja = pusty krok. „Zakończ takt" wstawia kreskę, „Nowa sekcja" nowy blok.
        </span>
      </div>

      <div className="d-flex flex-column gap-3">
        {sections.map((group, gi) => (
          <div key={gi}>
            <div
              className="fw-semibold text-uppercase mb-1"
              style={{ fontSize: "0.72rem", letterSpacing: "0.06em", color: "var(--frets-text-muted)" }}
            >
              Sekcja {gi + 1}
            </div>
            <div
              className="p-3 rounded-3"
              style={{
                background: "var(--frets-surface-2)",
                border: "1px solid var(--frets-border)",
                overflowX: "auto",
              }}
            >
              <div style={{ width: "max-content" }}>
                {STRINGS.map((label, si) => (
                  <div key={si} className="d-flex align-items-center" style={{ height: 34 }}>
                    <div
                      style={{
                        width: 20,
                        flexShrink: 0,
                        fontFamily: "monospace",
                        fontSize: 13,
                        color: "var(--frets-text-muted)",
                      }}
                    >
                      {label}
                    </div>
                    <div className="d-flex align-items-center">
                      {group.map(({ col, index }) =>
                        col.bar ? (
                          <div
                            key={index}
                            style={{
                              width: 14,
                              height: 34,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <div style={{ width: 2, height: 28, background: "var(--frets-text-muted)", opacity: 0.5 }} />
                          </div>
                        ) : (
                          <div
                            key={index}
                            onClick={(e) => clickCell(index, si, e)}
                            className="d-flex align-items-center justify-content-center"
                            style={{ width: 26, height: 34, flexShrink: 0, position: "relative", cursor: "pointer" }}
                          >
                            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "var(--frets-border)" }} />
                            {(() => {
                              const isActive = active && active.col === index && active.str === si;
                              const v = col.cells[si];
                              return (
                                <span
                                  style={{
                                    position: "relative",
                                    zIndex: 1,
                                    minWidth: 18,
                                    height: 20,
                                    padding: "0 3px",
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontFamily: "monospace",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    lineHeight: 1,
                                    background: isActive
                                      ? "var(--frets-accent)"
                                      : v
                                      ? "var(--frets-surface-2)"
                                      : "transparent",
                                    color: isActive ? "#fff" : "var(--frets-accent-light)",
                                    boxShadow: isActive ? "0 0 0 2px var(--frets-accent)" : "none",
                                  }}
                                >
                                  {v || (isActive ? " " : "")}
                                </span>
                              );
                            })()}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VisualTabEditor;
