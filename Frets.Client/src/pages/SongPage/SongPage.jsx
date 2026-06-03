import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Container, Card, Nav, Alert, Badge, Row, Col, Button } from "react-bootstrap";
import api from "../../api/client";
import ChordSheet from "../../components/ChordSheet";
import Skeleton from "../../components/Skeleton";
import EntityAvatar from "../../components/EntityAvatar";
import YouTubeEmbed from "../../components/YouTubeEmbed";
import SongChordDiagrams from "../../components/SongChordDiagrams";
import TabSheet from "../../components/TabSheet";
function SongPage() {
  const { artist, title } = useParams();
  const { user } = useAuth();

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
        document.title = `${songRes.data.title} – ${songRes.data.artist} | Frets`;

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
      <Container className="mt-4" style={{ maxWidth: "960px" }}>
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <div className="d-flex align-items-center gap-3">
              <Skeleton width={96} height={96} rounded />
              <div className="flex-grow-1">
                <Skeleton width="55%" height={26} className="mb-2" />
                <Skeleton width="32%" height={14} className="mb-3" />
                <Skeleton width={110} height={24} />
              </div>
            </div>
          </Card.Body>
        </Card>
        <Card className="shadow-sm">
          <Card.Body>
            <Skeleton width="40%" height={14} className="mb-3" />
            <Skeleton width="100%" height={160} />
          </Card.Body>
        </Card>
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

  const suggestionsPath =
    versions.length > 0
      ? `/songs/${artist}/${title}/suggestions?type=${activeType}`
      : null;

  return (
    <Container className="mt-4" style={{ maxWidth: "960px" }}>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="align-items-center g-3">
            <Col xs="auto">
              <EntityAvatar imageUrl={song.artistImageUrl} size={96} />
            </Col>
            <Col>
              <h2 className="mb-1">{song.title}</h2>
              <Link
                to={`/artists/${artistSlug}`}
                className="text-decoration-none fw-semibold d-inline-block mb-2"
              >
                {song.artist}
              </Link>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {song.genre && <Badge bg="secondary">{song.genre}</Badge>}
                {suggestionsPath && (
                  <Button
                    as={Link}
                    to={suggestionsPath}
                    variant="outline-primary"
                    size="sm"
                    className="ms-auto"
                  >
                    <i className="bi bi-pencil-square me-1" />
                    Zaproponuj poprawkę
                  </Button>
                )}
              </div>
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
        <div className="text-center py-5 text-muted">
          <i className="bi bi-music-note-list" style={{ fontSize: "2.5rem" }} />
          <p className="mt-2 mb-3">Ta piosenka nie ma jeszcze dodanych akordów ani tabulatury.</p>
          {user ? (
            <Link to="/songs/add" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1" />
              Dodaj akordy lub tabulaturę
            </Link>
          ) : (
            <p className="small">
              <Link to="/login">Zaloguj się</Link>, aby dodać akordy lub tabulaturę.
            </p>
          )}
        </div>
      ) : (
        <Card className="shadow-sm">
          {(hasChords && hasTab) && (
            <Card.Header className="border-bottom-0 pb-0">
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
                  <TabSheet content={activeVersion.content} />
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
