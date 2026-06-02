import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import api from "../api/client";
import ChordDiagram from "../components/ChordDiagram";
import guitar from "@tombatossals/chords-db/lib/guitar.json";

function ChordFamily() {
  const { key } = useParams();
  const [chords, setChords] = useState([]);
  const [loading, setLoading] = useState(true);

  const hasDiagram = (k, suffix) => {
    const dbKey = k.replace("#", "sharp");
    const list = guitar.chords[dbKey];
    if (!list) return false;
    const chord = list.find((c) => c.suffix === suffix);
    return chord && chord.positions && chord.positions.length > 0;
  };

  useEffect(() => {
    api
      .get("/chords")
      .then((res) =>
        setChords(
          res.data.filter((c) => c.key === key && hasDiagram(c.key, c.suffix))
        )
      )
      .catch(() => setChords([]))
      .finally(() => setLoading(false));
  }, [key]);

  const chordName = (k, suffix) => {
    if (suffix === "major") return k;
    if (suffix === "minor") return k + "m";
    return k + suffix;
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Link to="/chords" className="text-decoration-none">&larr; Wróć do tonacji</Link>
      <h2 className="my-3">Akordy {key}</h2>

      {chords.length === 0 ? (
        <p className="text-muted">Brak akordów dla tej tonacji.</p>
      ) : (
        <Row>
          {chords.map((chord) => (
            <Col key={chord.id} xs={6} sm={4} md={3} lg={2} className="mb-4 text-center">
              <Card>
                <Card.Body className="p-2">
                  <ChordDiagram chordKey={chord.key} suffix={chord.suffix} />
                  <div className="mt-2 fw-bold">{chordName(chord.key, chord.suffix)}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default ChordFamily;