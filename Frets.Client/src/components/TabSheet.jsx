import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { parseAsciiToGrid } from "./VisualTabEditor";

const NOTE_W = 22;
const NARROW_W = 14;
const LABEL_W = 22;

function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// Dzieli kolumny na „systemy" (linie) mieszczące się w dostępnej szerokości,
// łamiąc w miarę możliwości po kresce taktu.
function chunkColumns(colW, isBarArr, avail) {
  if (!avail || avail <= 0) return [[0, colW.length]];
  const systems = [];
  let lineStart = 0;
  let lastBar = -1;
  let width = 0;
  for (let i = 0; i < colW.length; i++) {
    if (width + colW[i] > avail && i > lineStart) {
      const breakIdx = lastBar >= lineStart && lastBar + 1 < i ? lastBar + 1 : i;
      systems.push([lineStart, breakIdx]);
      lineStart = breakIdx;
      lastBar = -1;
      width = 0;
      for (let j = lineStart; j <= i; j++) width += colW[j];
    } else {
      width += colW[i];
    }
    if (isBarArr[i]) lastBar = i;
  }
  systems.push([lineStart, colW.length]);
  return systems;
}

const STRINGS = ["e", "B", "G", "D", "A", "E"];

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

/** Zamienia treść (różne formaty) na grupy sekcji z taktami + tekst ASCII (fallback). */
function parseTab(content) {
  if (!content || !content.trim()) return { groups: [], ascii: "" };

  let data;
  try {
    data = JSON.parse(content);
  } catch {
    const measures = parseAsciiToGrid(content);
    return measures.length
      ? { groups: [{ label: null, measures }], ascii: content }
      : { groups: [], ascii: content };
  }

  // Format edytora wizualnego: { measures: [...] }
  if (Array.isArray(data.measures) && data.measures.length > 0) {
    return {
      groups: [{ label: null, measures: data.measures }],
      ascii: typeof data.ascii === "string" ? data.ascii : "",
    };
  }

  // Format sekcyjny: { sections: [{ label, type, lines: [{ string, notation }] }] }
  if (Array.isArray(data.sections) && data.sections.length > 0) {
    const groups = data.sections.map((sec) => {
      const ascii = (sec.lines ?? [])
        .map((l) => `${l.string ?? ""}|${l.notation ?? ""}|`)
        .join("\n");
      return {
        label: sec.label || sectionLabel(sec.type),
        measures: parseAsciiToGrid(ascii),
        ascii,
      };
    });
    return { groups, ascii: groups.map((g) => g.ascii).join("\n\n") };
  }

  // Starszy format: { type, ascii }
  if (typeof data.ascii === "string") {
    return { groups: [{ label: null, measures: parseAsciiToGrid(data.ascii) }], ascii: data.ascii };
  }

  return { groups: [], ascii: content };
}

const isBar = (v) => v === "|";
const isTechChar = (v) => v && v !== "|" && !/^\d/.test(v);

// Obetnij końcowe puste kolumny (parseAsciiToGrid dopełnia do stałej długości).
function trimMeasure(raw) {
  const n = raw[0]?.length ?? 0;
  let last = -1;
  for (let c = 0; c < n; c++) {
    if (raw.some((s) => (s[c] ?? "") !== "")) last = c;
  }
  return raw.map((s) => s.slice(0, last + 1));
}

function Measure({ measure: rawMeasure }) {
  const measure = useMemo(() => trimMeasure(rawMeasure), [rawMeasure]);
  const colCount = measure[0]?.length ?? 0;
  const [wrapRef, availWidth] = useElementWidth();

  // Kolumny z kreską taktu lub techniką renderowane węziej (dla wszystkich strun).
  const { narrowCols, colW, isBarArr } = useMemo(() => {
    const narrowCols = [];
    const colW = [];
    const isBarArr = [];
    for (let ci = 0; ci < colCount; ci++) {
      const bar = measure.some((str) => isBar(str[ci]));
      const narrow = bar || measure.some((str) => isTechChar(str[ci]));
      isBarArr.push(bar);
      narrowCols.push(narrow);
      colW.push(narrow ? NARROW_W : NOTE_W);
    }
    return { narrowCols, colW, isBarArr };
  }, [measure, colCount]);

  const systems = useMemo(
    // odejmujemy etykietę struny + poziomy padding panelu
    () => chunkColumns(colW, isBarArr, Math.max(0, availWidth - LABEL_W - 32)),
    [colW, isBarArr, availWidth]
  );

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <div className="tabv-measure">
        {systems.map(([a, b], sysIdx) => (
        <div key={sysIdx} className={sysIdx > 0 ? "mt-3" : ""}>
          {STRINGS.map((label, si) => (
            <div key={si} className="tabv-row">
              <span className="tabv-label">{label}</span>
              <div className="tabv-line">
                {measure[si].slice(a, b).map((val, idx) => {
                  const ci = a + idx;
                  return (
                    <div
                      key={ci}
                      className="tabv-cell"
                      style={narrowCols[ci] ? { width: NARROW_W } : undefined}
                    >
                      {isBar(val) ? (
                        <span className="tabv-bar" />
                      ) : val ? (
                        <span className={`tabv-note ${isTechChar(val) ? "tabv-note--tech" : ""}`}>
                          {val}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      </div>
    </div>
  );
}

function TabSheet({ content }) {
  const { groups, ascii } = useMemo(() => parseTab(content), [content]);
  const hasVisual = groups.some((g) => g.measures.length > 0);
  const [view, setView] = useState("visual");

  if (!content) return <div className="text-muted">Brak treści.</div>;

  // Brak danych do wizualizacji — pokaż surowy tekst.
  if (!hasVisual) {
    return (
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "14px" }}>
        {ascii || content}
      </pre>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-end mb-2">
        <div className="btn-group btn-group-sm" role="group" aria-label="Widok tabulatury">
          <Button
            variant={view === "visual" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => setView("visual")}
          >
            <i className="bi bi-grid-3x3-gap me-1" />
            Wizualnie
          </Button>
          <Button
            variant={view === "text" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => setView("text")}
          >
            <i className="bi bi-text-left me-1" />
            Tekst
          </Button>
        </div>
      </div>

      {view === "text" ? (
        <pre style={{ whiteSpace: "pre", overflowX: "auto", fontFamily: "monospace", fontSize: "14px" }}>
          {ascii}
        </pre>
      ) : (
        <div className="d-flex flex-column gap-3">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div
                  className="text-uppercase fw-semibold mb-2"
                  style={{ fontSize: "0.72rem", letterSpacing: "0.06em", color: "var(--frets-text-muted)" }}
                >
                  {group.label}
                </div>
              )}
              <div className="d-flex flex-column gap-3">
                {group.measures.map((measure, mi) => (
                  <Measure key={mi} measure={measure} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TabSheet;
