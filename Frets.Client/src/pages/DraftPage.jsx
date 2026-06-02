import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Card, Container, Nav, Spinner } from "react-bootstrap";
import api from "../api/client";
import ChordSheet from "../components/ChordSheet";
import { useAuth } from "../context/AuthContext";
import VotePanel, { formatVoteCounts } from "../components/VotePanel";
import slugify from "../utils/slugify";
import { getApiError, getSongId, isAdminUser } from "../utils/apiError";

function DraftPage() {
  const { artist, title } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [song, setSong] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeType, setActiveType] = useState("chords");
  const [loading, setLoading] = useState(true);
  const [songVoteLoading, setSongVoteLoading] = useState(false);
  const [error, setError] = useState("");
  const [voteMsg, setVoteMsg] = useState("");
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [adminMsgVariant, setAdminMsgVariant] = useState("secondary");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [songRes, versionsRes] = await Promise.all([
        api.get(`/songs/drafts/${artist}/${title}`),
        api.get(`/songs/${artist}/${title}/versions`),
      ]);
      setSong(songRes.data);
      setVersions(versionsRes.data ?? []);
      if (versionsRes.data?.length > 0) {
        setActiveType(versionsRes.data[0].versionType);
      }
    } catch {
      setError("Nie udało się załadować szkicu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [artist, title]);

  const activeVersion = useMemo(
    () => versions.find((v) => v.versionType === activeType),
    [versions, activeType]
  );
  const hasChords = versions.some((v) => v.versionType === "chords");
  const hasTab = versions.some((v) => v.versionType === "tab");

  const isSongVotingOpen = (status) => {
    const normalized = (status ?? "draft").toLowerCase();
    return normalized === "draft" || normalized === "pending";
  };

  const reloadSong = async () => {
    const songRes = await api.get(`/songs/drafts/${artist}/${title}`);
    setSong(songRes.data);
  };

  const handleSongVote = async (isPositive) => {
    if (!user || !song?.id) return;
    setVoteMsg("");
    setSongVoteLoading(true);
    try {
      const res = await api.post(`/songs/${song.id}/vote`, { isPositive });
      setSong((prev) =>
        prev
          ? {
              ...prev,
              positiveVoteWeight: res.data.positiveVoteWeight,
              negativeVoteWeight: res.data.negativeVoteWeight,
              userVoteIsPositive: res.data.userVoteIsPositive,
            }
          : prev
      );
      await reloadSong();
      setVoteMsg(isPositive ? "Oddano głos za publikację szkicu." : "Oddano głos przeciw publikacji szkicu.");
    } catch (err) {
      setVoteMsg(typeof err.response?.data === "string" ? err.response.data : "Nie udało się oddać głosu.");
    } finally {
      setSongVoteLoading(false);
    }
  };

  const handleAdminAction = async (action) => {
    const songId = getSongId(song);
    if (!songId) {
      setAdminMsgVariant("danger");
      setAdminMsg("Brak identyfikatora piosenki — odśwież stronę.");
      return;
    }
    if (!isAdminUser(user)) {
      setAdminMsgVariant("danger");
      setAdminMsg("Brak uprawnień administratora.");
      return;
    }

    setAdminMsg("");
    setAdminActionLoading(true);
    try {
      const res = await api.post(`/admin/songs/${songId}/${action}`);
      if (action === "approve") {
        setAdminMsgVariant("success");
        setAdminMsg("Piosenka została zatwierdzona.");
        setSong((prev) => (prev ? { ...prev, status: "approved" } : prev));
        navigate(`/songs/${slugify(song.artist)}/${slugify(song.title)}`);
        return;
      }
      const nextStatus = res.data?.status ?? (action === "reject" ? "rejected" : "pending");
      setSong((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setAdminMsgVariant("success");
      setAdminMsg(action === "reject" ? "Piosenka została odrzucona." : "Status piosenki został zaktualizowany.");
      if (action === "reject") {
        navigate("/drafts");
      }
    } catch (err) {
      setAdminMsgVariant("danger");
      setAdminMsg(getApiError(err, "Operacja administratora nie powiodła się."));
    } finally {
      setAdminActionLoading(false);
    }
  };

  const statusVariant = (status) => {
    if (status === "pending") return "warning";
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    return "secondary";
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
      <Container className="mt-4">
        <Alert variant="danger">{error || "Nie znaleziono szkicu."}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="mb-3">
        <h2 className="mb-1">{song.title}</h2>
        <p className="text-muted mb-2">{song.artist}</p>
        <div className="d-flex gap-2 align-items-center mb-2 flex-wrap">
          <Badge bg={statusVariant(song.status)}>{song.status}</Badge>
          {song.genre && <Badge bg="secondary">{song.genre}</Badge>}
          <Badge bg="light" text="dark">
            {formatVoteCounts(song.positiveVoteWeight, song.negativeVoteWeight)}
          </Badge>
          {activeVersion && (
            <Button
              as={Link}
              to={`/drafts/${artist}/${title}/suggestions?type=${activeType}`}
              variant="outline-primary"
              size="sm"
            >
              Zaproponuj poprawkę
            </Button>
          )}
        </div>

        {isAdminUser(user) && song.status !== "approved" && (
          <Card className="mb-3 border-primary">
            <Card.Body className="py-3">
              <Card.Title className="fs-6 mb-2">Panel administratora</Card.Title>
              <p className="small text-muted mb-2">
                Możesz natychmiast zatwierdzić lub odrzucić ten szkic, bez czekania na głosowanie społeczności.
              </p>
              {adminMsg && (
                <Alert variant={adminMsgVariant} className="py-2">
                  {adminMsg}
                </Alert>
              )}
              <div className="d-flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="success"
                  disabled={adminActionLoading}
                  onClick={() => handleAdminAction("approve")}
                >
                  {adminActionLoading ? "Zapisywanie..." : "Zatwierdź piosenkę"}
                </Button>
                <Button
                  type="button"
                  variant="outline-danger"
                  disabled={adminActionLoading}
                  onClick={() => handleAdminAction("reject")}
                >
                  Odrzuć
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        <Card className="mb-3">
          <Card.Body className="py-3">
            <Card.Title className="fs-6 mb-2">Głosowanie nad szkicem</Card.Title>
            <p className="small text-muted mb-2">
              Głosy decydują, czy szkic trafi do publikacji. Waga głosu zależy od poziomu konta.
            </p>
            <VotePanel
              positive={song.positiveVoteWeight ?? 0}
              negative={song.negativeVoteWeight ?? 0}
              userVote={song.userVoteIsPositive}
              canVote={Boolean(user) && isSongVotingOpen(song.status)}
              onVote={handleSongVote}
              loading={songVoteLoading}
            />
            {!user && isSongVotingOpen(song.status) && (
              <div className="small text-muted mt-2">Zaloguj się, aby głosować nad szkicem.</div>
            )}
            {user && !isSongVotingOpen(song.status) && (
              <div className="small text-muted mt-2">Głosowanie nad tym szkicem jest zamknięte.</div>
            )}
          </Card.Body>
        </Card>
      </div>

      {versions.length === 0 ? (
        <Alert variant="info">Ten szkic nie ma jeszcze wersji.</Alert>
      ) : (
        <Card className="mb-3">
          <Card.Header>
            <Nav variant="tabs" activeKey={activeType}>
              {hasChords && (
                <Nav.Item>
                  <Nav.Link eventKey="chords" onClick={() => setActiveType("chords")}>
                    Akordy
                  </Nav.Link>
                </Nav.Item>
              )}
              {hasTab && (
                <Nav.Item>
                  <Nav.Link eventKey="tab" onClick={() => setActiveType("tab")}>
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

export default DraftPage;
