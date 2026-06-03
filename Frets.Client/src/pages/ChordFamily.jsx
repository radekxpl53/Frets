import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Row, Col, Card, Spinner, Badge, Button } from "react-bootstrap";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import ChordDiagram from "../components/ChordDiagram";
import PracticeModal from "../components/PracticeModal";
import guitar from "@tombatossals/chords-db/lib/guitar.json";

// ---- Helpers ----

const SUFFIX_ORDER = [
  "major", "minor",
  "7", "maj7", "m7",
  "6", "m6", "69", "m69",
  "sus2", "sus4", "7sus4",
  "9", "maj9", "m9", "add9", "madd9",
  "11", "maj11", "m11", "aug9",
  "13", "maj13",
  "dim", "dim7", "m7b5", "aug", "aug7",
  "7b5", "7b9", "7#9", "9b5", "9#11",
  "mmaj7", "mmaj7b5", "mmaj9", "mmaj11",
  "maj7b5", "maj7#5",
];

function suffixPriority(suffix) {
  const idx = SUFFIX_ORDER.indexOf(suffix);
  return idx === -1 ? SUFFIX_ORDER.length : idx;
}

function hasDiagram(key, suffix) {
  const dbKey = key.replace("#", "sharp");
  const list = guitar.chords[dbKey];
  if (!list) return false;
  const chord = list.find((c) => c.suffix === suffix);
  return chord && chord.positions && chord.positions.length > 0;
}

function chordName(key, suffix) {
  if (suffix === "major") return key;
  if (suffix === "minor") return key + "m";
  return key + suffix;
}

const MASTERY_VARIANTS = { new: "secondary", practiced: "warning", mastered: "success" };
const MASTERY_LABELS = { new: "Nowy", practiced: "Ćwiczony", mastered: "Opanowany" };

// ---- Component ----

function ChordFamily() {
  const { key } = useParams();
  const { user } = useAuth();

  const [chords, setChords] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [practiceChord, setPracticeChord] = useState(null);
  const [xpToast, setXpToast] = useState(null);

  useEffect(() => {
    const chordsReq = api.get("/chords");
    const progressReq = user ? api.get("/users/me/chords") : Promise.resolve(null);

    Promise.all([chordsReq, progressReq])
      .then(([chordsRes, progressRes]) => {
        const filtered = chordsRes.data
          .filter((c) => c.key === key && hasDiagram(c.key, c.suffix))
          .sort((a, b) => suffixPriority(a.suffix) - suffixPriority(b.suffix));
        setChords(filtered);

        if (progressRes) {
          const map = {};
          for (const entry of progressRes.data) map[entry.chordId] = entry.masteryLevel;
          setProgress(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key, user]);

  const updateMastery = async (chord, level) => {
    const prev = progress[chord.id];
    if (prev === level) return;
    try {
      await api.put(`/users/me/chords/${chord.id}`, { masteryLevel: level });
      setProgress((p) => ({ ...p, [chord.id]: level }));
      if (level === "mastered" && prev !== "mastered") {
        setXpToast("+30 XP");
        setTimeout(() => setXpToast(null), 2500);
      }
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  const mastered = user ? chords.filter((c) => progress[c.id] === "mastered").length : 0;
  const practiced = user ? chords.filter((c) => progress[c.id] === "practiced").length : 0;

  return (
    <Container className="mt-4">
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <Link to="/chords" className="text-decoration-none">
            &larr; Wróć do tonacji
          </Link>
          <h2 className="my-1">Akordy {key}</h2>
        </div>
        <div className="d-flex align-items-center gap-2">
          {xpToast && <span className="badge bg-success fs-6">{xpToast}</span>}
        </div>
      </div>

      {/* Progress stats */}
      {user && chords.length > 0 && (
        <div className="d-flex gap-3 mb-4 flex-wrap">
          <div className="border rounded p-2 text-center" style={{ minWidth: 80 }}>
            <div className="fw-bold text-success fs-5">{mastered}</div>
            <small className="text-muted">Opanowane</small>
          </div>
          <div className="border rounded p-2 text-center" style={{ minWidth: 80 }}>
            <div className="fw-bold text-warning fs-5">{practiced}</div>
            <small className="text-muted">Ćwiczone</small>
          </div>
          <div className="border rounded p-2 text-center" style={{ minWidth: 80 }}>
            <div className="fw-bold text-secondary fs-5">{chords.length - mastered - practiced}</div>
            <small className="text-muted">Pozostałe</small>
          </div>
        </div>
      )}

      {!user && (
        <p className="text-muted mb-3">
          <Link to="/login">Zaloguj się</Link>, aby śledzić postęp i ćwiczyć z mikrofonem.
        </p>
      )}

      {/* Chord grid */}
      {chords.length === 0 ? (
        <p className="text-muted">Brak akordów dla tej tonacji.</p>
      ) : (
        <Row>
          {chords.map((chord) => {
            const level = progress[chord.id] ?? "new";
            return (
              <Col key={chord.id} xs={6} sm={4} md={3} lg={2} className="mb-4">
                <Card className="h-100 text-center">
                  <Card.Body className="p-2 d-flex flex-column align-items-center gap-1">
                    <ChordDiagram chordKey={chord.key} suffix={chord.suffix} />
                    <div className="fw-bold">{chordName(chord.key, chord.suffix)}</div>

                    {user && (
                      <>
                        <Badge bg={MASTERY_VARIANTS[level]}>
                          {MASTERY_LABELS[level]}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="w-100 mt-1"
                          style={{ fontSize: "0.72rem" }}
                          onClick={() => setPracticeChord(chord)}
                        >
                          Ćwicz
                        </Button>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Practice modal */}
      {practiceChord && (
        <PracticeModal
          chord={practiceChord}
          currentMastery={progress[practiceChord.id] ?? "new"}
          onClose={() => setPracticeChord(null)}
          onMasteryUpdate={updateMastery}
        />
      )}
    </Container>
  );
}

export default ChordFamily;
