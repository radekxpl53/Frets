import { Container, Row, Col } from "react-bootstrap";
import ChordDiagram from "../components/ChordDiagram";

function Chords() {
  const testChords = [
    { key: "C", suffix: "major" },
    { key: "A", suffix: "minor" },
    { key: "G", suffix: "major" },
    { key: "F#", suffix: "minor" },
  ];

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Akordy</h2>
      <Row>
        {testChords.map((c, i) => (
          <Col key={i} xs={6} md={3} className="mb-4 text-center">
            <ChordDiagram chordKey={c.key} suffix={c.suffix} />
            <div className="mt-2">{c.key}{c.suffix === "minor" ? "m" : ""}</div>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default Chords;