import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Container, Nav, Spinner } from "react-bootstrap";
import api from "../../api/client";
import VersionSuggestionsSection from "../../components/VersionSuggestionsSection";
import { useAuth } from "../../context/AuthContext";

function VersionSuggestionsPage() {
  const { artist, title } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const isDraft = location.pathname.startsWith("/drafts/");

  const backPath = isDraft
    ? `/drafts/${artist}/${title}`
    : `/songs/${artist}/${title}`;

  const [song, setSong] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeType, setActiveType] = useState("chords");

  const typeParam = searchParams.get("type");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const songUrl = isDraft
          ? `/songs/drafts/${artist}/${title}`
          : `/songs/${artist}/${title}`;
        const [songRes, versionsRes] = await Promise.all([
          api.get(songUrl),
          api.get(`/songs/${artist}/${title}/versions`),
        ]);
        setSong(songRes.data);
        setVersions(versionsRes.data ?? []);
      } catch {
        setError("Nie udało się załadować piosenki.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [artist, title, isDraft]);

  useEffect(() => {
    if (versions.length === 0) return;
    const preferred =
      versions.find((v) => v.versionType === typeParam) ??
      versions.find((v) => v.versionType === "chords") ??
      versions[0];
    setActiveType(preferred.versionType);
  }, [versions, typeParam]);

  const activeVersion = useMemo(
    () => versions.find((v) => v.versionType === activeType),
    [versions, activeType],
  );

  const hasChords = versions.some((v) => v.versionType === "chords");
  const hasTab = versions.some((v) => v.versionType === "tab");

  const selectType = (type) => {
    setActiveType(type);
    setSearchParams({ type }, { replace: true });
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !song) {
    return (
      <Container className="mt-4" style={{ maxWidth: "960px" }}>
        <Alert variant="danger">{error || "Nie znaleziono piosenki."}</Alert>
        <Button as={Link} to={backPath} variant="link" className="px-0">
          ← Wróć
        </Button>
      </Container>
    );
  }

  if (versions.length === 0) {
    return (
      <Container className="mt-4" style={{ maxWidth: "960px" }}>
        <Button as={Link} to={backPath} variant="link" className="px-0 mb-3">
          ← Wróć do {isDraft ? "szkicu" : "piosenki"}
        </Button>
        <Alert variant="info">Brak wersji do poprawienia — najpierw dodaj akordy lub tabulaturę.</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4" style={{ maxWidth: "960px" }}>
      <Button as={Link} to={backPath} variant="link" className="px-0 mb-3">
        ← Wróć do {isDraft ? "szkicu" : "piosenki"}
      </Button>

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <h2 className="h4 mb-1">Propozycje poprawek</h2>
          <p className="text-muted mb-0">
            {song.title} · {song.artist}
            {isDraft ? " · szkic" : ""}
          </p>
        </Card.Body>
      </Card>

      {(hasChords && hasTab) && (
        <Card className="mb-3 shadow-sm">
          <Card.Header className="bg-white pb-0">
            <Nav variant="tabs" activeKey={activeType}>
              {hasChords && (
                <Nav.Item>
                  <Nav.Link eventKey="chords" onClick={() => selectType("chords")} style={{ cursor: "pointer" }}>
                    Akordy
                  </Nav.Link>
                </Nav.Item>
              )}
              {hasTab && (
                <Nav.Item>
                  <Nav.Link eventKey="tab" onClick={() => selectType("tab")} style={{ cursor: "pointer" }}>
                    Tabulatura
                  </Nav.Link>
                </Nav.Item>
              )}
            </Nav>
          </Card.Header>
        </Card>
      )}

      {activeVersion && (
        <VersionSuggestionsSection activeVersion={activeVersion} user={user} />
      )}
    </Container>
  );
}

export default VersionSuggestionsPage;
