import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form } from "react-bootstrap";
import api from "../api/client";
import AdminActionBar from "./AdminActionBar";
import ChordLyricsEditor from "./ChordLyricsEditor";
import ChordSheet from "./ChordSheet";
import FormField from "./FormField";
import VersionContentEditor from "./VersionContentEditor";
import VotePanel, { formatVoteCounts } from "./VotePanel";
import { useFormErrors } from "../hooks/useFormErrors";
import {
  buildChordJsonFromEditorText,
  chordContentJsonToEditorText,
  buildTabJsonFromAscii,
  tabContentJsonToEditorText,
} from "../utils/chordEditorUtils";
import { validateRequired } from "../utils/validation";

const STATUS_PL = { pending: "Oczekuje", approved: "Zatwierdzona", rejected: "Odrzucona" };

function statusVariant(status) {
  if (status === "pending")  return "warning";
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "secondary";
}

function VersionSuggestionsSection({ activeVersion, user, sectionId = "song-suggestions" }) {
  const [suggestions, setSuggestions] = useState([]);
  const [comment, setComment] = useState("");
  const [suggestedContent, setSuggestedContent] = useState("");
  const [chordEditorText, setChordEditorText] = useState("");
  const [allChords, setAllChords] = useState([]);
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [adminActionId, setAdminActionId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [voteMsg, setVoteMsg] = useState("");
  const suggestionErrors = useFormErrors();

  useEffect(() => {
    const loadChords = async () => {
      try {
        const res = await api.get("/chords");
        setAllChords(res.data ?? []);
      } catch {
        setAllChords([]);
      }
    };
    loadChords();
  }, []);

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
      setSuggestedContent(tabContentJsonToEditorText(activeVersion.content));
      setChordEditorText("");
    }
  }, [activeVersion?.id, activeVersion?.versionType, activeVersion?.content]);

  const handleAdminAction = async (suggestionId, action) => {
    setVoteMsg("");
    setAdminActionId(suggestionId);
    try {
      await api.post(`/admin/suggestions/${suggestionId}/${action}`);
      setVoteMsg(action === "approve" ? "Propozycja zatwierdzona." : "Propozycja odrzucona.");
      await reloadSuggestions();
    } catch (err) {
      setVoteMsg(
        typeof err.response?.data === "string" ? err.response.data : "Operacja nie powiodła się.",
      );
    } finally {
      setAdminActionId(null);
    }
  };

  const reloadSuggestions = async () => {
    if (!activeVersion?.id) return;
    const res = await api.get(`/suggestions/version/${activeVersion.id}`);
    setSuggestions(res.data ?? []);
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
            : s,
        ),
      );
      await reloadSuggestions();
      setVoteMsg(isPositive ? "Oddano głos na propozycję." : "Oddano głos przeciw propozycji.");
    } catch (err) {
      setVoteMsg(
        typeof err.response?.data === "string" ? err.response.data : "Nie udało się oddać głosu.",
      );
    } finally {
      setVoteLoadingId(null);
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
          : buildTabJsonFromAscii(suggestedContent);

      await api.post(`/suggestions/version/${activeVersion.id}`, {
        content,
        comment: comment || null,
      });
      setComment("");
      await reloadSuggestions();
      setVoteMsg("Dodano propozycję poprawki.");
    } catch (err) {
      if (!suggestionErrors.applyApiError(err)) {
        suggestionErrors.setFieldError("comment", "Nie udało się dodać propozycji.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!activeVersion) return null;

  return (
    <div id={sectionId}>
      <Card className="mb-3 shadow-sm">
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
                {submitLoading ? "Zapisywanie…" : "Dodaj propozycję"}
              </Button>
            </Form>
          ) : (
            <Alert variant="info" className="mb-0 py-2">
              Zaloguj się, aby komentować i proponować poprawki.
            </Alert>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title className="fs-6">Propozycje i komentarze do tej wersji</Card.Title>
          {voteMsg && (
            <Alert variant="secondary" className="py-2">
              {voteMsg}
            </Alert>
          )}
          {suggestions.length === 0 ? (
            <div className="text-muted">Brak propozycji dla tej wersji.</div>
          ) : (
            suggestions.map((s) => (
              <Card key={s.id} className="mb-2">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <small className="text-muted">
                      {s.authorUsername} · {new Date(s.createdAt).toLocaleString("pl-PL")}
                    </small>
                    <div className="d-flex gap-2 align-items-center">
                      <Badge bg="secondary" className="fw-normal">
                        {formatVoteCounts(s.positiveVoteWeight, s.negativeVoteWeight)}
                      </Badge>
                      <Badge bg={statusVariant(s.status)}>{STATUS_PL[s.status] ?? s.status}</Badge>
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
                      <pre
                        style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                        className="mt-2 mb-0"
                      >
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
                  {user?.role === "admin" && s.status === "pending" && (
                    <AdminActionBar
                      disabled={adminActionId === s.id}
                      actions={[
                        {
                          label: "Zatwierdź",
                          icon: "bi-check-lg",
                          variant: "success",
                          onClick: () => handleAdminAction(s.id, "approve"),
                        },
                        {
                          label: "Odrzuć",
                          icon: "bi-x-lg",
                          variant: "outline-danger",
                          onClick: () => handleAdminAction(s.id, "reject"),
                        },
                      ]}
                    />
                  )}
                </Card.Body>
              </Card>
            ))
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default VersionSuggestionsSection;
