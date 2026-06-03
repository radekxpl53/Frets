import { useEffect, useMemo, useState } from "react";
import { Row, Col, Spinner } from "react-bootstrap";
import api from "../api/client";
import ChordDiagram from "./ChordDiagram";
import {
  chordDisplayName,
  extractChordNamesFromContent,
  matchChordNamesToLibrary,
} from "../utils/chordNameUtils";

function SongChordDiagrams({ content }) {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/chords");
        if (!cancelled) setLibrary(res.data ?? []);
      } catch {
        if (!cancelled) setLibrary([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const chords = useMemo(() => {
    const names = extractChordNamesFromContent(content);
    return matchChordNamesToLibrary(names, library);
  }, [content, library]);

  if (loading) {
    return (
      <div className="text-center py-2">
        <Spinner size="sm" animation="border" />
      </div>
    );
  }

  if (chords.length === 0) return null;

  return (
    <div
      className="mb-4 p-3 rounded-3"
      style={{ background: "var(--frets-surface-2)", border: "1px solid var(--frets-border)" }}
    >
      <div
        className="text-uppercase fw-semibold mb-3"
        style={{ fontSize: "0.72rem", letterSpacing: "0.06em", color: "var(--frets-text-muted)" }}
      >
        Diagramy akordów
      </div>
      <Row className="g-3">
        {chords.map((chord) => (
          <Col key={`${chord.key}-${chord.suffix}`} xs={6} sm={4} md={3} lg={2}>
            <div className="text-center">
              <ChordDiagram chordKey={chord.key} suffix={chord.suffix} />
              <div className="small fw-semibold mt-1">
                {chordDisplayName(chord.key, chord.suffix)}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default SongChordDiagrams;
