import { useState, useEffect, useRef } from "react";
import { Button, Card, Col, Row, Form } from "react-bootstrap";

const DEFAULT_COLS = 16;
const STRINGS = ["e", "B", "G", "D", "A", "E"];

const createEmptyMeasure = (cols = DEFAULT_COLS) => {
  return Array.from({ length: 6 }, () => Array(cols).fill(""));
};

const deepCloneMeasures = (m) => m.map(measure => measure.map(row => [...row]));

export const serializeGridToAscii = (measures) => {
  if (!measures || measures.length === 0) return "";
  const lines = [];

  measures.forEach((measure) => {
    const cols = measure[0].length;
    const colWidths = Array(cols).fill(1);
    for (let c = 0; c < cols; c++) {
      let maxLen = 1;
      for (let s = 0; s < 6; s++) {
        if (measure[s][c] && measure[s][c].length > maxLen) {
          maxLen = measure[s][c].length;
        }
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
          if (val.length < width) {
            strLine += "-".repeat(width - val.length);
          }
        } else {
          strLine += "-".repeat(width);
        }
        if (c < cols - 1) {
          strLine += "-";
        }
      }
      strLine += "-|";
      return strLine;
    });

    lines.push(measureLines.join("\n"));
  });

  return lines.join("\n\n");
};

const serializeGridToJson = (measures) => {
  return JSON.stringify({
    type: "tab",
    measures,
    ascii: serializeGridToAscii(measures),
  });
};

const parseValueToGrid = (value) => {
  if (!value || !value.trim()) return [];

  try {
    const data = JSON.parse(value);
    if (data && Array.isArray(data.measures) && data.measures.length > 0) {
      return data.measures;
    }
  } catch {
    return parseAsciiToGrid(value);
  }

  return [];
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
          if (/\d/.test(char) && /\d/.test(nextChar)) {
            width = 2;
          }
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

function VisualTabEditor({ value, onChange }) {
  const [measures, setMeasures] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [colsPerMeasure, setColsPerMeasure] = useState(DEFAULT_COLS);
  const containerRef = useRef(null);

  useEffect(() => {
    const parsed = parseValueToGrid(value);
    if (parsed.length > 0) {
      setMeasures(parsed);
      setColsPerMeasure(parsed[0][0].length);
    } else {
      const defaultMeasure = [createEmptyMeasure(DEFAULT_COLS)];
      setMeasures(defaultMeasure);
      setColsPerMeasure(DEFAULT_COLS);
      if (onChange) {
        onChange(serializeGridToAscii(defaultMeasure));
      }
    }
  }, [value === ""]);

  const updateAndSave = (nextMeasures) => {
    setMeasures(nextMeasures);
    if (onChange) {
      onChange(serializeGridToAscii(nextMeasures));
    }
  };

  const handleCellClick = (measureIdx, stringIdx, colIdx, e) => {
    e.stopPropagation();
    setActiveCell({ measureIdx, stringIdx, colIdx });
    if (containerRef.current) containerRef.current.focus();
  };

  const handleContainerBlur = () => {};

  const handleKeyDown = (e) => {
    if (!activeCell) return;
    const { measureIdx, stringIdx, colIdx } = activeCell;
    const currentMeasure = measures[measureIdx];
    const totalCols = currentMeasure[0].length;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (stringIdx > 0) setActiveCell({ measureIdx, stringIdx: stringIdx - 1, colIdx });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (stringIdx < 5) setActiveCell({ measureIdx, stringIdx: stringIdx + 1, colIdx });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (colIdx > 0) {
        setActiveCell({ measureIdx, stringIdx, colIdx: colIdx - 1 });
      } else if (measureIdx > 0) {
        const prevCols = measures[measureIdx - 1][0].length;
        setActiveCell({ measureIdx: measureIdx - 1, stringIdx, colIdx: prevCols - 1 });
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (colIdx < totalCols - 1) {
        setActiveCell({ measureIdx, stringIdx, colIdx: colIdx + 1 });
      } else if (measureIdx < measures.length - 1) {
        setActiveCell({ measureIdx: measureIdx + 1, stringIdx, colIdx: 0 });
      }
    }

    const isDigit = /^[0-9]$/.test(e.key);
    const isTechnique = /^[hps/\\b~x]$/i.test(e.key);

    if (isDigit) {
      e.preventDefault();
      const nextMeasures = deepCloneMeasures(measures);
      const prevVal = nextMeasures[measureIdx][stringIdx][colIdx];
      let nextVal = e.key;
      if (prevVal && /^[0-9]$/.test(prevVal)) {
        const combined = prevVal + e.key;
        if (parseInt(combined, 10) <= 24) nextVal = combined;
      }
      nextMeasures[measureIdx][stringIdx][colIdx] = nextVal;
      updateAndSave(nextMeasures);
      if (colIdx < totalCols - 1) {
        setActiveCell({ measureIdx, stringIdx, colIdx: colIdx + 1 });
      } else if (measureIdx < measures.length - 1) {
        setActiveCell({ measureIdx: measureIdx + 1, stringIdx, colIdx: 0 });
      }
    } else if (isTechnique) {
      e.preventDefault();
      const nextMeasures = deepCloneMeasures(measures);
      nextMeasures[measureIdx][stringIdx][colIdx] = e.key.toLowerCase();
      updateAndSave(nextMeasures);
      if (colIdx < totalCols - 1) {
        setActiveCell({ measureIdx, stringIdx, colIdx: colIdx + 1 });
      } else if (measureIdx < measures.length - 1) {
        setActiveCell({ measureIdx: measureIdx + 1, stringIdx, colIdx: 0 });
      }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const nextMeasures = deepCloneMeasures(measures);
      nextMeasures[measureIdx][stringIdx][colIdx] = "";
      updateAndSave(nextMeasures);
      if (e.key === "Backspace") {
        if (colIdx > 0) {
          setActiveCell({ measureIdx, stringIdx, colIdx: colIdx - 1 });
        } else if (measureIdx > 0) {
          const prevCols = measures[measureIdx - 1][0].length;
          setActiveCell({ measureIdx: measureIdx - 1, stringIdx, colIdx: prevCols - 1 });
        }
      }
    }
  };

  const handleAddMeasure = () => {
    const nextMeasures = [...deepCloneMeasures(measures), createEmptyMeasure(colsPerMeasure)];
    updateAndSave(nextMeasures);
    setActiveCell({ measureIdx: nextMeasures.length - 1, stringIdx: 0, colIdx: 0 });
  };

  const handleRemoveMeasure = (idx) => {
    if (measures.length <= 1) {
      const nextMeasures = [createEmptyMeasure(colsPerMeasure)];
      updateAndSave(nextMeasures);
      setActiveCell(null);
      return;
    }
    const nextMeasures = deepCloneMeasures(measures.filter((_, i) => i !== idx));
    updateAndSave(nextMeasures);
    setActiveCell(null);
  };

  const handleClearMeasure = (idx) => {
    const nextMeasures = deepCloneMeasures(measures);
    nextMeasures[idx] = createEmptyMeasure(colsPerMeasure);
    updateAndSave(nextMeasures);
  };

  const insertTechniqueViaButton = (char) => {
    if (!activeCell) return;
    const { measureIdx, stringIdx, colIdx } = activeCell;
    const nextMeasures = deepCloneMeasures(measures);
    nextMeasures[measureIdx][stringIdx][colIdx] = char;
    updateAndSave(nextMeasures);
    const totalCols = measures[measureIdx][0].length;
    if (colIdx < totalCols - 1) {
      setActiveCell({ measureIdx, stringIdx, colIdx: colIdx + 1 });
    } else if (measureIdx < measures.length - 1) {
      setActiveCell({ measureIdx: measureIdx + 1, stringIdx, colIdx: 0 });
    }
    if (containerRef.current) containerRef.current.focus();
  };

  const handleColsChange = (e) => {
    const nextCols = parseInt(e.target.value, 10);
    setColsPerMeasure(nextCols);
    const nextMeasures = measures.map((measure) =>
      Array.from({ length: 6 }, (_, s) => {
        const row = [...measure[s]];
        if (row.length < nextCols) {
          while (row.length < nextCols) row.push("");
        } else if (row.length > nextCols) {
          row.length = nextCols;
        }
        return row;
      })
    );
    updateAndSave(nextMeasures);
    setActiveCell(null);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onBlur={handleContainerBlur}
      className="visual-tab-editor-container outline-none"
      style={{ outline: "none" }}
    >
      <Card className="mb-3 border-0 bg-light shadow-sm">
        <Card.Body className="py-2 px-3">
          <Row className="align-items-center g-3">
            <Col xs="auto" className="d-flex align-items-center gap-2">
              <span className="small fw-semibold text-muted">Długość taktu:</span>
              <Form.Select
                size="sm"
                value={colsPerMeasure}
                onChange={handleColsChange}
                style={{ width: "90px" }}
              >
                <option value={8}>8 kroków</option>
                <option value={12}>12 kroków</option>
                <option value={16}>16 kroków</option>
                <option value={24}>24 kroki</option>
                <option value={32}>32 kroki</option>
              </Form.Select>
            </Col>
            <Col className="d-flex flex-wrap gap-1 align-items-center">
              <span className="small fw-semibold text-muted me-2">Techniki:</span>
              {[
                { label: "h (hammer-on)", val: "h" },
                { label: "p (pull-off)", val: "p" },
                { label: "/ (slide up)", val: "/" },
                { label: "\\ (slide down)", val: "\\" },
                { label: "b (bend)", val: "b" },
                { label: "~ (vibrato)", val: "~" },
                { label: "x (tłumiony)", val: "x" },
              ].map((tech) => (
                <Button
                  key={tech.val}
                  size="sm"
                  variant="outline-primary"
                  type="button"
                  disabled={!activeCell}
                  onClick={() => insertTechniqueViaButton(tech.val)}
                  title={tech.label}
                  style={{ minWidth: "32px", fontWeight: "600" }}
                >
                  {tech.val}
                </Button>
              ))}
            </Col>
            <Col xs="auto">
              <Button size="sm" variant="success" type="button" onClick={handleAddMeasure}>
                + Dodaj takt
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="d-flex flex-column gap-4">
        {measures.map((measure, measureIdx) => (
          <Card key={measureIdx} className="shadow-sm border-light">
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <span className="fw-semibold text-primary small">Takt {measureIdx + 1}</span>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  type="button"
                  onClick={() => handleClearMeasure(measureIdx)}
                  style={{ fontSize: "12px", padding: "2px 8px" }}
                >
                  Wyczyść
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  type="button"
                  onClick={() => handleRemoveMeasure(measureIdx)}
                  style={{ fontSize: "12px", padding: "2px 8px" }}
                >
                  Usuń
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-3 bg-light overflow-auto">
              <div className="position-relative d-flex flex-column select-none" style={{ minWidth: "500px" }}>
                {STRINGS.map((strLabel, stringIdx) => {
                  const cells = measure[stringIdx];
                  return (
                    <div
                      key={strLabel}
                      className="d-flex align-items-center position-relative"
                      style={{ height: "36px" }}
                    >
                      <div
                        className="fw-bold text-muted d-flex align-items-center justify-content-center"
                        style={{ width: "24px", zIndex: 1, fontSize: "14px", marginRight: "8px", fontFamily: "monospace" }}
                      >
                        {strLabel}
                      </div>
                      <div
                        className="position-absolute bg-secondary opacity-50"
                        style={{ left: "32px", right: 0, top: "50%", height: "2px", transform: "translateY(-50%)", zIndex: 0 }}
                      />
                      <div className="d-flex flex-grow-1 align-items-center justify-content-between position-relative z-1" style={{ paddingLeft: "8px" }}>
                        {cells.map((cellValue, colIdx) => {
                          const isActive =
                            activeCell &&
                            activeCell.measureIdx === measureIdx &&
                            activeCell.stringIdx === stringIdx &&
                            activeCell.colIdx === colIdx;
                          return (
                            <div
                              key={colIdx}
                              onClick={(e) => handleCellClick(measureIdx, stringIdx, colIdx, e)}
                              className="d-flex align-items-center justify-content-center border position-relative rounded-circle cursor-pointer"
                              style={{
                                width: "26px",
                                height: "26px",
                                backgroundColor: cellValue ? "#0d6efd" : isActive ? "#e7f1ff" : "#fff",
                                color: cellValue ? "#fff" : "#000",
                                borderColor: isActive ? "#0d6efd" : "#dee2e6",
                                borderWidth: isActive ? "2px" : "1px",
                                boxShadow: isActive ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)" : "none",
                                cursor: "pointer",
                                transition: "all 0.1s ease-in-out",
                              }}
                            >
                              <span style={{ fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
                                {cellValue || ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default VisualTabEditor;