import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Container, Card, Nav, Spinner, Alert, Badge } from "react-bootstrap";
import api from "../api/client";
import ChordSheet from "../components/ChordSheet";

function SongPage() {
  const { artist, title } = useParams();

  const [song, setSong] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeType, setActiveType] = useState("chords");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const [songRes, versionsRes] = await Promise.all([
          api.get(`/songs/${artist}/${title}`),
          api.get(`/songs/${artist}/${title}/versions`),
        ]);
        setSong(songRes.data);
        setVersions(versionsRes.data);

        if (versionsRes.data.length > 0) {
          setActiveType(versionsRes.data[0].versionType);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [artist, title]);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !song) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">Nie znaleziono piosenki.</Alert>
      </Container>
    );
  }

  const activeVersion = versions.find((v) => v.versionType === activeType);
  const hasChords = versions.some((v) => v.versionType === "chords");
  const hasTab = versions.some((v) => v.versionType === "tab");

  return (
    <Container className="mt-4">
      <div className="mb-3">
        <h2 className="mb-1">{song.title}</h2>
        <p className="text-muted mb-2">{song.artist}</p>
        {song.genre && <Badge bg="secondary">{song.genre}</Badge>}
      </div>

      {versions.length === 0 ? (
        <Alert variant="info">
          Ta piosenka nie ma jeszcze dodanych akordów ani tabulatury.
        </Alert>
      ) : (
        <Card>
          <Card.Header>
            <Nav variant="tabs" activeKey={activeType}>
              {hasChords && (
                <Nav.Item>
                  <Nav.Link
                    eventKey="chords"
                    onClick={() => setActiveType("chords")}
                  >
                    Akordy
                  </Nav.Link>
                </Nav.Item>
              )}
              {hasTab && (
                <Nav.Item>
                  <Nav.Link
                    eventKey="tab"
                    onClick={() => setActiveType("tab")}
                  >
                    Tabulatura
                  </Nav.Link>
                </Nav.Item>
              )}
            </Nav>
          </Card.Header>
          <Card.Body>
            {activeVersion && (
              <>
                <div className="mb-3 text-muted">
                  <small>
                    Strój: {activeVersion.tuning}
                    {activeVersion.key && ` · Tonacja: ${activeVersion.key}`}
                    {activeVersion.capo > 0 && ` · Kapodaster: ${activeVersion.capo}`}
                  </small>
                </div>
                {activeVersion.versionType === "chords" ? (
                <ChordSheet content={activeVersion.content} />
                ) : (
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                    {activeVersion.content}
                </pre>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default SongPage;