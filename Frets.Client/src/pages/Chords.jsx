import { Container, Row, Col, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import ChordDiagram from "../components/ChordDiagram";

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

function Chords() {
  return (
    <Container className="mt-4">
      <h2 className="mb-4">Akordy</h2>
      <p className="text-muted">Wybierz tonację, aby zobaczyć wszystkie akordy z tej rodziny.</p>

      <Row>
        {KEYS.map((key) => (
          <Col key={key} xs={6} sm={4} md={3} lg={2} className="mb-4 text-center">
            <Card as={Link} to={`/chords/${encodeURIComponent(key)}`} className="text-decoration-none text-dark h-100">
              <Card.Body className="p-2">
                <ChordDiagram chordKey={key} suffix="major" />
                <div className="mt-2 fw-bold">{key}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default Chords;