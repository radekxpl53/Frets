import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Card, Nav, Spinner, Alert, Badge, Row, Col } from "react-bootstrap";
import api from "../api/client";
import ChordSheet from "../components/ChordSheet";
import EntityAvatar from "../components/EntityAvatar";
import YouTubeEmbed from "../components/YouTubeEmbed";
import SongChordDiagrams from "../components/SongChordDiagrams";

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
          const preferred =
            versionsRes.data.find((v) => v.versionType === "chords") ??
            versionsRes.data[0];
          setActiveType(preferred.versionType);
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
  const artistSlug = song.artistSlug ?? artist;

  return (
    <Container className="mt-4" style={{ maxWidth: "960px" }}>
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center g-3">
            <Col xs="auto">
              <EntityAvatar imageUrl={song.artistImageUrl} size={96} />
            </Col>
            <Col>
              <h2 className="mb-1">{song.title}</h2>
              <p className="mb-2">
                <Link
                  to={`/artists/${artistSlug}`}
                  className="text-decoration-none fw-semibold"
                >
                  {song.artist}
                </Link>
              </p>
              {song.genre && <Badge bg="secondary">{song.genre}</Badge>}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {song.youTubeUrl && (
        <div className="mb-4">
          <YouTubeEmbed url={song.youTubeUrl} title={`${song.title} — ${song.artist}`} />
        </div>
      )}

      {versions.length === 0 ? (
        <Alert variant="info">
          Ta piosenka nie ma jeszcze dodanych akordów ani tabulatury.
        </Alert>
      ) : (
        <Card className="shadow-sm">
          {(hasChords && hasTab) && (
            <Card.Header className="bg-white border-bottom-0 pb-0">
              <Nav variant="tabs" activeKey={activeType}>
                {hasChords && (
                  <Nav.Item>
                    <Nav.Link
                      eventKey="chords"
                      onClick={() => setActiveType("chords")}
                      style={{ cursor: "pointer" }}
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
                      style={{ cursor: "pointer" }}
                    >
                      Tabulatura
                    </Nav.Link>
                  </Nav.Item>
                )}
              </Nav>
            </Card.Header>
          )}
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

                {activeVersion.versionType === "chords" && (
                  <SongChordDiagrams content={activeVersion.content} />
                )}

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
