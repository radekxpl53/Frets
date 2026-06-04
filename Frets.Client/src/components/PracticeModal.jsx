import { useState, useEffect, useRef, useMemo } from "react";
import { Modal, Button, Alert, ProgressBar } from "react-bootstrap";
import ChordDiagram from "./ChordDiagram";
import guitar from "@tombatossals/chords-db/lib/guitar.json";

// ─── Dane muzyczne ────────────────────────────────────────────────────────────

const NOTE_NAMES   = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STRING_NAMES = ["E2", "A2", "D3", "G3", "B3", "e4"];
const STRING_NUMS  = ["6", "5", "4", "3", "2", "1"];

function midiToName(midi) {
  return NOTE_NAMES[midi % 12] + Math.floor(midi / 12 - 1);
}

function getChordStrings(key, suffix) {
  const dbKey = key.replace("#", "sharp");
  const list = guitar.chords[dbKey];
  if (!list) return [];
  const chord = list.find((c) => c.suffix === suffix);
  if (!chord?.positions?.length) return [];

  const { frets, midi } = chord.positions[0];
  const result = [];
  let midiIdx = 0;
  for (let i = 0; i < frets.length; i++) {
    if (frets[i] === -1) continue;
    const midiNote = midi[midiIdx++];
    if (midiNote == null) continue;
    result.push({
      stringIndex: i,
      midi: midiNote,
      freq: 440 * Math.pow(2, (midiNote - 69) / 12),
      stringNum: STRING_NUMS[i],
      openName: STRING_NAMES[i],
      noteName: midiToName(midiNote),
    });
  }
  return result;
}

// ─── Pitch detection ─────────────────────────────────────────────────────────

function detectPitch(buffer, sampleRate) {
  const n = buffer.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  if (Math.sqrt(rms / n) < 0.008) return null; // niżej → łapie też gasnące struny

  const minLag = Math.floor(sampleRate / 1400);
  const maxLag = Math.min(Math.ceil(sampleRate / 60), n - 1);

  let bestCorr = -Infinity, bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0, len = n - lag;
    for (let i = 0; i < len; i++) corr += buffer[i] * buffer[i + lag];
    corr /= len;
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  if (bestLag === -1 || bestCorr < 0.003) return null;
  return sampleRate / bestLag;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chordName(key, suffix) {
  if (suffix === "major") return key;
  if (suffix === "minor") return key + "m";
  return key + suffix;
}

const TOLERANCE = 55;   // ± centów (z tolerancją oktawy) — wyrozumiałe dla mikrofonu
const HOLD_FRAMES = 16;  // ~0.27 s dobrego brzmienia (z dekrementacją zamiast resetu)

// Cents do najbliższej oktawy nuty docelowej. Odporne na błędy oktawowe
// autokorelacji (łapanie harmonicznej) oraz na zagranie nuty w innej oktawie —
// dzięki temu dobrze zagrana struna faktycznie zalicza.
function centsToTargetClass(freq, target) {
  let ratio = freq / target;
  if (!(ratio > 0)) return Infinity;
  while (ratio > Math.SQRT2) ratio /= 2;
  while (ratio < Math.SQRT1_2) ratio *= 2;
  return 1200 * Math.log2(ratio);
}

// ─── Ikona strun ─────────────────────────────────────────────────────────────

function StringIcon({ state }) {
  if (state === "done")
    return <i className="bi bi-check-circle-fill text-success" />;
  if (state === "active")
    return <i className="bi bi-arrow-right-circle-fill text-primary" />;
  return <i className="bi bi-circle text-secondary opacity-50" />;
}

// ─── Komponent ───────────────────────────────────────────────────────────────

export default function PracticeModal({ chord, currentMastery, onClose, onMasteryUpdate }) {
  const strings = useMemo(() => getChordStrings(chord.key, chord.suffix), [chord]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone]             = useState([]);
  const [cents, setCents]           = useState(null);
  const [phase, setPhase]           = useState("playing"); // playing | complete
  const [micError, setMicError]     = useState(null);

  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);
  const streamRef    = useRef(null);
  const rafRef       = useRef(null);
  const holdRef      = useRef(0);
  const currentIdxRef = useRef(0);

  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // start mikrofonu
  useEffect(() => {
    if (!strings.length) return;
    let cancelled = false;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        tick();
      })
      .catch(() => setMicError("Brak dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki."));

    return () => { cancelled = true; stopMic(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strings]);

  const stopMic = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close();
  };

  const tick = () => {
    if (!analyserRef.current) return;
    const buf = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buf);
    const freq = detectPitch(buf, analyserRef.current.context.sampleRate);
    const idx  = currentIdxRef.current;

    if (freq && strings[idx]) {
      const c = centsToTargetClass(freq, strings[idx].freq);
      setCents(c);
      if (Math.abs(c) <= TOLERANCE) {
        holdRef.current = Math.min(HOLD_FRAMES, holdRef.current + 1);
        if (holdRef.current >= HOLD_FRAMES) {
          holdRef.current = 0;
          advance(idx);
          return;
        }
      } else {
        // zła wysokość → powolny spadek, a nie twardy reset (pojedyncze skoki
        // wykrywania nie kasują całego postępu)
        holdRef.current = Math.max(0, holdRef.current - 1);
      }
    } else {
      setCents(null);
      // krótka cisza (gasnąca struna) też nie kasuje postępu od razu
      holdRef.current = Math.max(0, holdRef.current - 1);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const advance = (idx) => {
    setDone((prev) => { const n = [...prev]; n[idx] = true; return n; });
    const next = idx + 1;
    if (next >= strings.length) {
      setPhase("complete");
      stopMic();
    } else {
      setCurrentIdx(next);
      setCents(null);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handleMastery = async (level) => {
    await onMasteryUpdate(chord, level);
    onClose();
  };

  // ── wartości do wyświetlenia ──────────────────────────────────────────────

  const current     = strings[currentIdx];
  const inTune      = cents !== null && Math.abs(cents) <= TOLERANCE;
  const centsRounded = cents !== null ? Math.round(cents) : 0;
  const needlePct   = cents === null ? 50 : Math.max(0, Math.min(100, 50 + (cents / TOLERANCE) * 40));
  const holdPct     = Math.round((holdRef.current / HOLD_FRAMES) * 100);

  const needleColor = cents === null
    ? "#ced4da"
    : inTune ? "var(--bs-success)" : "var(--bs-danger)";

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton className="border-bottom-0 pb-0">
        <Modal.Title className="fs-5">
          <i className="bi bi-music-note-beamed me-2 text-primary" />
          Ćwicz: {chordName(chord.key, chord.suffix)}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">
        {micError && <Alert variant="danger" className="py-2">{micError}</Alert>}

        {/* ── Diagram + lista strun ── */}
        <div className="d-flex gap-3 mb-3">
          {/* diagram */}
          <div style={{ flexShrink: 0 }}>
            <ChordDiagram chordKey={chord.key} suffix={chord.suffix} />
          </div>

          {/* lista strun */}
          <div className="d-flex flex-column justify-content-center gap-1 flex-grow-1">
            {strings.map((s, i) => {
              const state = done[i] ? "done" : i === currentIdx && phase === "playing" ? "active" : "idle";
              return (
                <div
                  key={i}
                  className={`d-flex align-items-center gap-2 rounded px-2 py-1 ${
                    state === "active" ? "bg-primary bg-opacity-10" : ""
                  }`}
                  style={{ fontSize: "0.83rem" }}
                >
                  <StringIcon state={state} />
                  <span className={state === "idle" ? "text-muted" : ""}>
                    Struna <strong>{s.stringNum}</strong>
                  </span>
                  <span className="ms-auto text-secondary" style={{ fontSize: "0.75rem" }}>
                    {s.noteName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Panel feedback (tylko podczas grania) ── */}
        {phase === "playing" && current && !micError && (
          <div
            className="border rounded-3 p-3"
            style={{ background: "var(--frets-surface-2)", borderColor: "var(--frets-border)" }}
          >
            {/* nagłówek */}
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-mic-fill text-danger" style={{ fontSize: "1.1rem" }} />
              <span style={{ fontSize: "0.9rem" }}>
                Zagraj strunę <strong>{current.stringNum}</strong> — nuta{" "}
                <strong>{current.noteName}</strong>
              </span>
            </div>

            {/* igła */}
            <div
              className="position-relative mb-1"
              style={{ height: 22, background: "var(--frets-border)", borderRadius: 11 }}
            >
              {/* środek */}
              <div style={{
                position: "absolute", left: "50%", top: 3,
                width: 2, height: 16, background: "var(--frets-text-muted)",
                transform: "translateX(-50%)",
              }} />
              {/* kulka */}
              <div style={{
                position: "absolute",
                left: `calc(${needlePct}% - 11px)`,
                top: 1, width: 20, height: 20, borderRadius: "50%",
                background: needleColor,
                opacity: cents === null ? 0.3 : 1,
                transition: "left 0.07s linear, background 0.12s",
              }} />
            </div>

            {/* etykiety */}
            <div className="d-flex justify-content-between mb-2" style={{ fontSize: "0.7rem", color: "var(--frets-text-muted)" }}>
              <span>za nisko</span>
              <span>
                {cents === null
                  ? <><i className="bi bi-volume-mute" /> cisza</>
                  : inTune
                  ? <><i className="bi bi-check2 text-success" /> trafiłeś!</>
                  : `${centsRounded > 0 ? "+" : ""}${centsRounded} ct`}
              </span>
              <span>za wysoko</span>
            </div>

            {/* pasek trzymania */}
            <ProgressBar
              now={holdPct}
              variant="success"
              style={{ height: 6, opacity: inTune ? 1 : 0, transition: "opacity 0.2s" }}
            />
          </div>
        )}

        {/* ── Sukces ── */}
        {phase === "complete" && (
          <div className="border rounded-3 p-3 text-center bg-success bg-opacity-10 border-success">
            <i className="bi bi-patch-check-fill text-success" style={{ fontSize: "2rem" }} />
            <div className="fw-semibold mt-1">Wszystkie struny zagrane poprawnie!</div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top-0 pt-0 justify-content-between">
        <div className="d-flex gap-2">
          {currentMastery !== "practiced" && phase !== "complete" && (
            <Button variant="outline-warning" size="sm" onClick={() => handleMastery("practiced")}>
              <i className="bi bi-star-half me-1" />
              Ćwiczony
            </Button>
          )}
          <Button variant="success" size="sm" onClick={() => handleMastery("mastered")}>
            <i className="bi bi-star-fill me-1" />
            Opanowany
          </Button>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={onClose}>
          Zamknij
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
