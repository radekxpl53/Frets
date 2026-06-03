import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import ChordDiagram from "../components/ChordDiagram";
import guitar from "@tombatossals/chords-db/lib/guitar.json";

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const MASTERY_LEVELS = ["new", "practiced", "mastered"];
const MASTERY_LABELS = { new: "Nowy", practiced: "Ćwiczony", mastered: "Opanowany" };
const MASTERY_VARIANTS = { new: "secondary", practiced: "warning", mastered: "success" };

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

function LearnChords() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allChords, setAllChords] = useState([]);
  const [progress, setProgress] = useState({}); // chordId -> masteryLevel
  const [selectedKey, setSelectedKey] = useState("C");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // chordId being updated
  const [xpToast, setXpToast] = useState(null); // "+30 XP"

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    Promise.all([api.get("/chords"), api.get("/users/me/chords")])
      .then(([chordsRes, progressRes]) => {
        const chords = chordsRes.data.filter((c) => hasDiagram(c.key, c.suffix));
        setAllChords(chords);

        const map = {};
        for (const entry of progressRes.data) {
          map[entry.chordId] = entry.masteryLevel;
        }
        setProgress(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const updateMastery = async (chord, level) => {
    const prev = progress[chord.id];
    if (prev === level) return;

    setUpdating(chord.id);
    try {
      await api.put(`/users/me/chords/${chord.id}`, { masteryLevel: level });
      setProgress((p) => ({ ...p, [chord.id]: level }));

      if (level === "mastered" && prev !== "mastered") {
        setXpToast("+30 XP");
        setTimeout(() => setXpToast(null), 2500);
      }
    } catch {
      // silent
    } finally {
      setUpdating(null);
    }
  };

  const counts = Object.values(progress).reduce(
    (acc, lvl) => {
      acc[lvl] = (acc[lvl] ?? 0) + 1;
      return acc;
    },
    { new: 0, practiced: 0, mastered: 0 }
  );

  const visibleChords = allChords.filter((c) => c.key === selectedKey);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex align-items-start justify-content-between mb-2 flex-wrap gap-2">
        <div>
          <h2 className="mb-0">Nauka akordów</h2>
          <p className="text-muted mb-0">Śledź postęp nauki i oznaczaj opanowane akordy.</p>
        </div>
        {xpToast && (
          <div className="alert alert-success py-1 px-3 mb-0" style={{ fontSize: "1.1rem" }}>
            {xpToast}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="d-flex gap-3 mb-4 flex-wrap">
        <div className="border rounded p-2 text-center" style={{ minWidth: 90 }}>
          <div className="fw-bold text-success fs-4">{counts.mastered}</div>
          <small className="text-muted">Opanowane</small>
        </div>
        <div className="border rounded p-2 text-center" style={{ minWidth: 90 }}>
          <div className="fw-bold text-warning fs-4">{counts.practiced}</div>
          <small className="text-muted">Ćwiczone</small>
        </div>
        <div className="border rounded p-2 text-center" style={{ minWidth: 90 }}>
          <div className="fw-bold text-secondary fs-4">{allChords.length - counts.mastered - counts.practiced}</div>
          <small className="text-muted">Pozostałe</small>
        </div>
      </div>

      {/* Key selector */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {KEYS.map((k) => {
          const chordsInKey = allChords.filter((c) => c.key === k);
          const masteredInKey = chordsInKey.filter((c) => progress[c.id] === "mastered").length;
          const allMastered = chordsInKey.length > 0 && masteredInKey === chordsInKey.length;
          return (
            <Button
              key={k}
              variant={selectedKey === k ? "dark" : allMastered ? "outline-success" : "outline-secondary"}
              size="sm"
              onClick={() => setSelectedKey(k)}
            >
              {k}
              {masteredInKey > 0 && (
                <Badge
                  bg={allMastered ? "success" : "warning"}
                  className="ms-1"
                  style={{ fontSize: "0.65rem" }}
                >
                  {masteredInKey}/{chordsInKey.length}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Chord grid */}
      {visibleChords.length === 0 ? (
        <p className="text-muted">Brak akordów dla tej tonacji.</p>
      ) : (
        <Row>
          {visibleChords.map((chord) => {
            const level = progress[chord.id] ?? "new";
            const isUpdating = updating === chord.id;
            return (
              <Col key={chord.id} xs={6} sm={4} md={3} lg={2} className="mb-4">
                <Card className="h-100 text-center">
                  <Card.Body className="p-2 d-flex flex-column align-items-center gap-1">
                    <ChordDiagram chordKey={chord.key} suffix={chord.suffix} />
                    <div className="fw-bold">{chordName(chord.key, chord.suffix)}</div>
                    <Badge bg={MASTERY_VARIANTS[level]} className="mb-1">
                      {MASTERY_LABELS[level]}
                    </Badge>
                    <div className="d-flex flex-column gap-1 w-100">
                      {MASTERY_LEVELS.map((lvl) => (
                        <Button
                          key={lvl}
                          size="sm"
                          variant={level === lvl ? MASTERY_VARIANTS[lvl] : `outline-${MASTERY_VARIANTS[lvl]}`}
                          disabled={isUpdating}
                          onClick={() => updateMastery(chord, lvl)}
                          style={{ fontSize: "0.7rem", padding: "2px 4px" }}
                        >
                          {MASTERY_LABELS[lvl]}
                        </Button>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
}

export default LearnChords;
