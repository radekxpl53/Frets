import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Card, Container, Form, Nav, Spinner } from "react-bootstrap";
import api from "../api/client";
import ChordLyricsEditor from "../components/ChordLyricsEditor";
import ChordSheet from "../components/ChordSheet";
import { useAuth } from "../context/AuthContext";
import VersionContentEditor from "../components/VersionContentEditor";
import VotePanel, { formatVoteCounts } from "../components/VotePanel";
import {
  buildChordJsonFromEditorText,
  chordContentJsonToEditorText,
} from "../utils/chordEditorUtils";
import slugify from "../utils/slugify";
import { getApiError, getSongId, isAdminUser } from "../utils/apiError";
import FormField from "../components/FormField";
import { useFormErrors } from "../hooks/useFormErrors";
import { validateRequired } from "../utils/validation";

function DraftPage() {
  const { artist, title } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [song, setSong] = useState(null);
  const [versions, setVersions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeType, setActiveType] = useState("chords");
  const [loading, setLoading] = useState(true);
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [songVoteLoading, setSongVoteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [voteMsg, setVoteMsg] = useState("");
  const [comment, setComment] = useState("");
  const [suggestedContent, setSuggestedContent] = useState("");
  const [chordEditorText, setChordEditorText] = useState("");
  const [allChords, setAllChords] = useState([]);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [adminMsgVariant, setAdminMsgVariant] = useState("secondary");
  const suggestionErrors = useFormErrors();

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

  useEffect(() => {
    const loadChords = async () => {
      try {
        const res = await api.get("/chords");
        setAllChords((res.data ?? []).map((chord) => `${chord.key}${chord.suffix}`));
      } catch {
        setAllChords([]);
      }
    };
    loadChords();
  }, []);

  const activeVersion = useMemo(
    () => versions.find((v) => v.versionType === activeType),
    [versions, activeType]
  );
  const hasChords = versions.some((v) => v.versionType === "chords");
  const hasTab = versions.some((v) => v.versionType === "tab");

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!activeVersion?.id) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await api.get(`/suggestions/version/${activeVersion.id}`);
        setSuggestions(res.data ?? []);
      } catch {
        setSuggestions([]);
      }
    };
    loadSuggestions();
  }, [activeVersion?.id]);

  useEffect(() => {
    if (!activeVersion?.content) {
      setSuggestedContent("");
      setChordEditorText("");
      return;
    }
    if (activeVersion.versionType === "chords") {
      setChordEditorText(chordContentJsonToEditorText(activeVersion.content));
      setSuggestedContent("");
    } else {
      setSuggestedContent(activeVersion.content);
      setChordEditorText("");
    }
  }, [activeVersion?.id, activeVersion?.versionType, activeVersion?.content]);

  const isSongVotingOpen = (status) => {
    const normalized = (status ?? "draft").toLowerCase();
    return normalized === "draft" || normalized === "pending";
  };

  const reloadSong = async () => {
    const songRes = await api.get(`/songs/drafts/${artist}/${title}`);
    setSong(songRes.data);
  };

  const reloadSuggestions = async () => {
    if (!activeVersion?.id) return;
    const res = await api.get(`/suggestions/version/${activeVersion.id}`);
    setSuggestions(res.data ?? []);
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

  const handleSuggestionVote = async (suggestionId, isPositive) => {
    if (!user) return;
    setVoteMsg("");
    setVoteLoadingId(suggestionId);
    try {
      const res = await api.post(`/suggestions/${suggestionId}/vote`, { isPositive });
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                positiveVoteWeight: res.data.positiveVoteWeight,
                negativeVoteWeight: res.data.negativeVoteWeight,
                userVoteIsPositive: res.data.userVoteIsPositive,
              }
            : s
        )
      );
      await reloadSuggestions();
      setVoteMsg(isPositive ? "Oddano głos na propozycję." : "Oddano głos przeciw propozycji.");
    } catch (err) {
      setVoteMsg(typeof err.response?.data === "string" ? err.response.data : "Nie udało się oddać głosu.");
    } finally {
      setVoteLoadingId(null);
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

  const handleAddSuggestion = async (e) => {
    e.preventDefault();
    if (!activeVersion?.id || !user) return;
    suggestionErrors.clearErrors();

    const nextErrors = {};
    const commentError = validateRequired(comment, "Podaj komentarz.");
    if (commentError) nextErrors.comment = commentError;

    if (activeVersion.versionType === "chords" && !chordEditorText.trim()) {
      nextErrors.suggestedContent = "Wpisz proponowaną treść z akordami.";
    } else if (activeVersion.versionType === "tab" && !suggestedContent.trim()) {
      nextErrors.suggestedContent = "Wpisz proponowaną treść tabulatury.";
    }

    if (Object.keys(nextErrors).length > 0) {
      suggestionErrors.setFieldErrors(nextErrors);
      return;
    }

    setVoteMsg("");
    setSubmitLoading(true);
    try {
      const content =
        activeVersion.versionType === "chords"
          ? buildChordJsonFromEditorText(chordEditorText, allChords)
          : suggestedContent || activeVersion.content;

      await api.post(`/suggestions/version/${activeVersion.id}`, {
        content,
        comment: comment || null,
      });
      setComment("");
      const res = await api.get(`/suggestions/version/${activeVersion.id}`);
      setSuggestions(res.data ?? []);
      setVoteMsg("Dodano propozycję poprawki.");
    } catch (err) {
      if (!suggestionErrors.applyApiError(err)) {
        suggestionErrors.setFieldError("comment", "Nie udało się dodać propozycji.");
      }
    } finally {
      setSubmitLoading(false);
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

      {activeVersion && (
        <>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title className="fs-6">Komentarz / propozycja poprawki do tej wersji</Card.Title>
              {user ? (
                <Form onSubmit={handleAddSuggestion} noValidate>
                  <FormField label="Komentarz" error={suggestionErrors.getError("comment")}>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Opisz, co jest błędem i jak poprawić."
                      {...suggestionErrors.bindText("comment", comment, setComment)}
                    />
                  </FormField>
                  <Form.Group className="mb-2">
                    <Form.Label>Proponowana treść wersji</Form.Label>
                    {activeVersion.versionType === "chords" ? (
                      <ChordLyricsEditor
                        value={chordEditorText}
                        onChange={(v) => {
                          suggestionErrors.clearField("suggestedContent");
                          setChordEditorText(v);
                        }}
                        allChords={allChords}
                        isInvalid={Boolean(suggestionErrors.getError("suggestedContent"))}
                        error={suggestionErrors.getError("suggestedContent")}
                      />
                    ) : (
                      <VersionContentEditor
                        versionType="tab"
                        value={suggestedContent}
                        onChange={(v) => {
                          suggestionErrors.clearField("suggestedContent");
                          setSuggestedContent(v);
                        }}
                        rows={10}
                        isInvalid={Boolean(suggestionErrors.getError("suggestedContent"))}
                        error={suggestionErrors.getError("suggestedContent")}
                      />
                    )}
                  </Form.Group>
                  <Button type="submit" disabled={submitLoading}>
                    {submitLoading ? "Zapisywanie..." : "Dodaj propozycję"}
                  </Button>
                </Form>
              ) : (
                <Alert variant="info" className="mb-0 py-2">
                  Zaloguj się, aby komentować i proponować poprawki.
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title className="fs-6">Propozycje i komentarze do tej wersji</Card.Title>
              {voteMsg && <Alert variant="secondary" className="py-2">{voteMsg}</Alert>}
              {suggestions.length === 0 ? (
                <div className="text-muted">Brak propozycji dla tej wersji.</div>
              ) : (
                suggestions.map((s) => (
                  <Card key={s.id} className="mb-2">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <small className="text-muted">
                          {s.authorUsername} · {new Date(s.createdAt).toLocaleString()}
                        </small>
                        <div className="d-flex gap-2 align-items-center">
                          <Badge bg="light" text="dark" className="fw-normal">
                            {formatVoteCounts(s.positiveVoteWeight, s.negativeVoteWeight)}
                          </Badge>
                          <Badge bg={statusVariant(s.status)}>{s.status}</Badge>
                        </div>
                      </div>
                      {s.comment && <p className="mb-2">{s.comment}</p>}
                      <details>
                        <summary className="text-primary" style={{ cursor: "pointer" }}>
                          Pokaż proponowaną treść
                        </summary>
                        {activeVersion.versionType === "chords" ? (
                          <div className="mt-2">
                            <ChordSheet content={s.content} />
                          </div>
                        ) : (
                          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }} className="mt-2 mb-0">
                            {s.content}
                          </pre>
                        )}
                      </details>
                      {s.status === "pending" && (
                        <div className="mt-3">
                          <VotePanel
                            positive={s.positiveVoteWeight ?? 0}
                            negative={s.negativeVoteWeight ?? 0}
                            userVote={s.userVoteIsPositive}
                            canVote={Boolean(user)}
                            onVote={(isPositive) => handleSuggestionVote(s.id, isPositive)}
                            loading={voteLoadingId === s.id}
                          />
                          {!user && (
                            <div className="small text-muted">Zaloguj się, aby głosować nad propozycją.</div>
                          )}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
}

export default DraftPage;
