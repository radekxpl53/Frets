import { useState, useEffect, useRef, useCallback } from "react";
import { Container, Button, Alert } from "react-bootstrap";
import styles from "./Tuner.module.css";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const OPEN_STRINGS = [
  { label: "6", note: "E", octave: 2 },
  { label: "5", note: "A", octave: 2 },
  { label: "4", note: "D", octave: 3 },
  { label: "3", note: "G", octave: 3 },
  { label: "2", note: "B", octave: 3 },
  { label: "1", note: "E", octave: 4 },
];

function detectPitch(buffer, sampleRate) {
  const n = buffer.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  if (Math.sqrt(rms / n) < 0.01) return null;

  const minLag = Math.floor(sampleRate / 1400);
  const maxLag = Math.min(Math.ceil(sampleRate / 60), n - 1);

  let bestCorr = -Infinity, bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const len = n - lag;
    for (let i = 0; i < len; i++) corr += buffer[i] * buffer[i + lag];
    corr /= len;
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  if (bestLag === -1 || bestCorr < 0.005) return null;
  return sampleRate / bestLag;
}

function freqToNoteInfo(freq) {
  const midiExact = 12 * Math.log2(freq / 440) + 69;
  const midi = Math.round(midiExact);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  const noteFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const cents = Math.round(1200 * Math.log2(freq / noteFreq));
  return { note, octave, cents };
}

export default function Tuner() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);       // aktualna nuta lub null (cisza)
  const [lastResult, setLastResult] = useState(null); // ostatnia wykryta nuta

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastGoodRef = useRef({ info: null, time: 0 }); // ostatnie pewne wykrycie (do przytrzymania)
  const smoothFreqRef = useRef(null);                  // wygładzona częstotliwość

  const HOLD_MS = 600; // jak długo trzymać ostatnią nutę, gdy sygnał chwilowo zniknie

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setActive(false);
    setResult(null);
  }, []);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const freq = detectPitch(buf, analyser.context.sampleRate);
    const now = performance.now();
    if (freq) {
      // Wygładzanie: stabilizuje igłę, ale resetuje przy dużym skoku (zmiana struny/oktawy)
      const prev = smoothFreqRef.current;
      const smoothed =
        prev && Math.abs(freq - prev) / prev < 0.06 ? prev * 0.6 + freq * 0.4 : freq;
      smoothFreqRef.current = smoothed;
      const info = freqToNoteInfo(smoothed);
      lastGoodRef.current = { info, time: now };
      setResult(info);
      setLastResult(info);
    } else if (now - lastGoodRef.current.time < HOLD_MS) {
      // Przytrzymaj ostatnią nutę, żeby wyświetlacz nie migotał między klatkami
      setResult(lastGoodRef.current.info);
    } else {
      smoothFreqRef.current = null;
      setResult(null);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setActive(true);
      tick();
    } catch {
      setError("Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.");
    }
  };

  useEffect(() => { document.title = "Stroik gitarowy | Frets"; }, []);
  useEffect(() => () => stop(), [stop]);

  const silent = !result;
  const display = result ?? lastResult;
  const cents = display?.cents ?? 0;
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const needlePct = ((clampedCents + 50) / 100) * 100;

  const inTune = !silent && Math.abs(cents) <= 5;
  const close  = !silent && Math.abs(cents) <= 15;
  const color  = silent ? "secondary" : inTune ? "success" : close ? "warning" : "danger";
  const cssColor = `var(--bs-${color})`;

  const activeString = !silent && display
    ? OPEN_STRINGS.find((s) => s.note === display.note && s.octave === display.octave)
    : null;

  return (
    <Container className="mt-4" style={{ maxWidth: 420 }}>
      <h2 className="mb-1">Stroik</h2>
      <p className="text-muted mb-3">Gitara · strój standardowy (EADGBe)</p>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* ── Główny panel ── */}
      <div className={`${styles.panel} mb-3 text-center`}>
        {/* Nuta */}
        <div className={styles.noteDisplay}>
          {display ? (
            <div style={{ color: cssColor, transition: "color 0.15s" }}>
              <span className={styles.noteName}>{display.note}</span>
              <sub className={styles.noteOctave}>{display.octave}</sub>
            </div>
          ) : (
            <span className={styles.placeholder}>·</span>
          )}
        </div>

        {/* Status */}
        <div className={styles.statusLine} style={{ color: cssColor }}>
          {!active ? "Naciśnij Start"
            : silent ? "Zagraj strunę…"
            : inTune ? "✓ Nastrojony"
            : cents > 0 ? `+${cents} ct — za wysoko`
            : `${cents} ct — za nisko`}
        </div>

        {/* Igła */}
        <div className={styles.needleTrack}>
          {[-30, -10, 10, 30].map((v) => (
            <div key={v} className={styles.needleTick} style={{ left: `${((v + 50) / 100) * 100}%` }} />
          ))}
          <div className={styles.needleCenter} />
          <div
            className={styles.needleBall}
            style={{
              left: `calc(${needlePct}% - 12px)`,
              background: cssColor,
              opacity: silent ? 0.3 : 1,
            }}
          />
        </div>

        {/* Etykiety */}
        <div className={styles.needleLabels}>
          <span>−50 ct</span><span>0</span><span>+50 ct</span>
        </div>

        {/* Przycisk */}
        {active ? (
          <Button variant="outline-danger" onClick={stop}>Stop</Button>
        ) : (
          <Button variant="primary" onClick={start}>Start</Button>
        )}
      </div>

      {/* ── Struny referencyjne ── */}
      <p className="text-muted mb-2" style={{ fontSize: "0.85rem" }}>
        Struny w stroju standardowym
      </p>
      <div className={styles.stringRef}>
        {OPEN_STRINGS.map((s) => {
          const isActive = activeString?.label === s.label;
          return (
            <div
              key={s.label}
              className={`${styles.stringTile} ${isActive ? styles.stringTileActive : ""}`}
            >
              <div className={styles.stringNote}>
                {s.note}<sub style={{ fontSize: "0.62rem" }}>{s.octave}</sub>
              </div>
              <div className={styles.stringLabel}>str. {s.label}</div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
