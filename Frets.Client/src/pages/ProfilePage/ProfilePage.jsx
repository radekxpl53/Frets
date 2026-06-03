import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Modal,
  Nav,
  Row,
  Spinner,
} from "react-bootstrap";
import api from "../../api/client";
import EditableProfileAvatar from "../../components/EditableProfileAvatar";
import EntityAvatar from "../../components/EntityAvatar";
import { useAuth } from "../../context/AuthContext";
import FormField from "../../components/FormField";
import { useFormErrors } from "../../hooks/useFormErrors";
import {
  validateEmail,
  validatePassword,
  validateUsername,
  PASSWORD_MESSAGES,
} from "../../utils/validation";

function ProfilePage() {
  const { slug } = useParams();
  const { user: currentUser, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [songs, setSongs] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("songs");

  const [showEditModal, setShowEditModal] = useState(false);
  const [modalPanel, setModalPanel] = useState("profile");
  const [editBio, setEditBio] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalMsgVariant, setModalMsgVariant] = useState("success");
  const formErrors = useFormErrors();
  const [pageMsg, setPageMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailChangeSent, setEmailChangeSent] = useState(false);

  const isOwner = currentUser?.slug === slug;

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, songsRes, draftsRes] = await Promise.all([
        api.get(`/users/${encodeURIComponent(slug)}`),
        api.get(`/users/${encodeURIComponent(slug)}/songs`),
        api.get(`/users/${encodeURIComponent(slug)}/drafts`),
      ]);
      setProfile(profileRes.data);
      setSongs(songsRes.data ?? []);
      setDrafts(draftsRes.data ?? []);
    } catch {
      setError("Nie znaleziono profilu.");
      setProfile(null);
      setSongs([]);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [slug]);

  const openEditModal = () => {
    setEditBio(profile.bio ?? "");
    setEditUsername(profile.username ?? "");
    setModalImageUrl(profile.imageUrl ?? null);
    setModalMsg("");
    formErrors.clearErrors();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setNewEmail("");
    setEmailChangePassword("");
    setEmailChangeSent(false);
    setModalPanel("profile");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (saveLoading || avatarLoading || pwdLoading || emailLoading) return;
    setShowEditModal(false);
    setModalPanel("profile");
    setModalMsg("");
    formErrors.clearErrors();
  };

  const goToSecurityPanel = () => {
    setModalMsg("");
    formErrors.clearErrors();
    setModalPanel("security");
  };

  const goToProfilePanel = () => {
    setModalMsg("");
    formErrors.clearErrors();
    setModalPanel("profile");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    formErrors.clearErrors();
    setModalMsg("");

    const nextErrors = {};
    if (!currentPassword) nextErrors.currentPassword = "Podaj obecne hasło.";
    const newPwdError = validatePassword(newPassword);
    if (newPwdError) nextErrors.newPassword = newPwdError;
    if (newPassword !== confirmNewPassword) nextErrors.confirmNewPassword = PASSWORD_MESSAGES.mismatch;

    if (Object.keys(nextErrors).length > 0) {
      formErrors.setFieldErrors(nextErrors);
      return;
    }

    setPwdLoading(true);
    try {
      await api.put("/users/me/password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setModalMsg("Hasło zostało zmienione.");
      setModalMsgVariant("success");
    } catch (err) {
      if (!formErrors.applyApiError(err)) {
        formErrors.setFieldError("currentPassword", "Nie udało się zmienić hasła.");
      }
    } finally {
      setPwdLoading(false);
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    formErrors.clearErrors();
    setModalMsg("");
    setEmailChangeSent(false);

    const nextErrors = {};
    const emailError = validateEmail(newEmail);
    if (emailError) nextErrors.newEmail = emailError;
    if (!emailChangePassword) nextErrors.emailChangePassword = "Podaj hasło.";

    if (Object.keys(nextErrors).length > 0) {
      formErrors.setFieldErrors(nextErrors);
      return;
    }

    setEmailLoading(true);
    try {
      await api.post("/users/me/email/change-request", {
        newEmail: newEmail.trim(),
        currentPassword: emailChangePassword,
      });
      setEmailChangeSent(true);
      setNewEmail("");
      setEmailChangePassword("");
      setModalMsg("Wysłano link potwierdzający na nowy adres email.");
      setModalMsgVariant("success");
    } catch (err) {
      if (!formErrors.applyApiError(err)) {
        formErrors.setFieldError("newEmail", "Nie udało się wysłać linku.");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setModalMsg("");
    formErrors.clearErrors();
    const trimmedUsername = editUsername.trim();
    const usernameError = validateUsername(trimmedUsername);
    if (usernameError) {
      formErrors.setFieldError("username", usernameError);
      setSaveLoading(false);
      return;
    }
    try {
      const res = await api.put("/users/me", {
        username: trimmedUsername || null,
        bio: editBio,
      });
      await refreshUser?.();
      if (res.data.slug !== slug) {
        window.location.href = `/users/${encodeURIComponent(res.data.slug)}`;
        return;
      }
      setProfile((prev) => ({
        ...prev,
        username: res.data.username,
        bio: res.data.bio,
        imageUrl: res.data.imageUrl ?? modalImageUrl,
      }));
      setPageMsg("Zapisano profil.");
      setShowEditModal(false);
    } catch (err) {
      if (!formErrors.applyApiError(err)) {
        formErrors.setFieldError("username", "Nie udało się zapisać profilu.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarChange = async (file) => {
    if (!file) return;
    setAvatarLoading(true);
    setModalMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await api.post("/images/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const profileRes = await api.put("/users/me/image", {
        imageId: uploadRes.data.id,
      });
      const newUrl = profileRes.data.imageUrl;
      setModalImageUrl(newUrl);
      setProfile((prev) => ({ ...prev, imageUrl: newUrl }));
      await refreshUser?.();
      setModalMsg("Zaktualizowano zdjęcie.");
      setModalMsgVariant("success");
    } catch {
      formErrors.setFieldError("avatar", "Nie udało się wgrać zdjęcia.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const statusVariant = (status) => {
    const s = (status ?? "draft").toLowerCase();
    if (s === "pending")  return "warning";
    if (s === "approved") return "success";
    if (s === "rejected") return "danger";
    return "secondary";
  };

  const songLink = (song) => {
    const path = `${song.artistSlug}/${song.titleSlug}`;
    return (song.status ?? "").toLowerCase() === "approved"
      ? `/songs/${path}`
      : `/drafts/${path}`;
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !profile) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error || "Nie znaleziono profilu."}</Alert>
      </Container>
    );
  }

  const list = activeTab === "songs" ? songs : drafts;
  const displayImageUrl = modalImageUrl ?? profile.imageUrl;

  return (
    <Container className="mt-4" style={{ maxWidth: "900px" }}>
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="g-3 align-items-start">
            <Col xs="auto">
              {isOwner ? (
                <EditableProfileAvatar
                  imageUrl={profile.imageUrl}
                  size={96}
                  onEdit={openEditModal}
                />
              ) : (
                <EntityAvatar imageUrl={profile.imageUrl} size={96} />
              )}
            </Col>
            <Col>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                <div>
                  <h2 className="mb-1">{profile.username}</h2>
                  <p className="text-muted mb-2">
                    Poziom {profile.level} · {profile.levelLabel}
                  </p>
                </div>
                {isOwner && (
                  <div className="d-flex gap-2 flex-wrap">
                    <Button variant="outline-primary" size="sm" onClick={openEditModal}>
                      <i className="bi bi-pencil me-1" />Edytuj profil
                    </Button>
                    {currentUser?.role === "admin" && (
                      <Button variant="outline-secondary" size="sm" as={Link} to="/admin">
                        <i className="bi bi-shield-lock me-1" />Panel admina
                      </Button>
                    )}
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => { logout(); navigate("/"); }}
                    >
                      <i className="bi bi-box-arrow-right me-1" />Wyloguj
                    </Button>
                  </div>
                )}
              </div>

              {profile.bio ? (
                <p className="mb-3" style={{ whiteSpace: "pre-wrap" }}>
                  {profile.bio}
                </p>
              ) : (
                isOwner && (
                  <p className="text-muted mb-3">Dodaj opis w edycji profilu.</p>
                )
              )}

              <Row className="g-2 small text-muted">
                <Col xs={6} sm={4}>Seria: {profile.currentStreak} dni</Col>
                <Col xs={6} sm={4}>Rekord: {profile.longestStreak} dni</Col>
                <Col xs={6} sm={4}>Akordy: {profile.chordsLearned}</Col>
                <Col xs={6} sm={4}>Piosenki: {profile.songsAdded}</Col>
                <Col xs={6} sm={4}>
                  Od {new Date(profile.createdAt).toLocaleDateString("pl-PL")}
                </Col>
              </Row>
            </Col>
          </Row>

          {pageMsg && (
            <Alert variant="success" className="mt-3 mb-0 py-2">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <span className="mb-0">{pageMsg}</span>
                <button
                  type="button"
                  className="btn-close flex-shrink-0"
                  aria-label="Zamknij"
                  onClick={() => setPageMsg("")}
                />
              </div>
            </Alert>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Header className="px-3 pt-3 pb-0" style={{ borderBottom: "none" }}>
          <Nav variant="tabs" activeKey={activeTab}>
            <Nav.Item>
              <Nav.Link eventKey="songs" onClick={() => setActiveTab("songs")} style={{ cursor: "pointer" }}>
                Piosenki ({songs.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="drafts" onClick={() => setActiveTab("drafts")} style={{ cursor: "pointer" }}>
                Szkice ({drafts.length})
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
        <Card.Body>
          {list.length === 0 ? (
            <p className="text-muted mb-0">
              {activeTab === "songs" ? "Brak opublikowanych piosenek." : "Brak szkiców."}
            </p>
          ) : (
            <ListGroup variant="flush">
              {list.map((song) => (
                <ListGroup.Item
                  key={song.id}
                  action
                  as={Link}
                  to={songLink(song)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <span className="fw-semibold">{song.title}</span>
                    <span className="text-muted"> · {song.artist}</span>
                  </div>
                  <Badge bg={statusVariant(song.status)}>
                    {{ draft: "Szkic", pending: "Oczekuje", approved: "Zatwierdzona", rejected: "Odrzucona" }[song.status ?? "draft"] ?? song.status}
                  </Badge>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {isOwner && (
        <Modal show={showEditModal} onHide={closeEditModal} centered>
          <Modal.Header closeButton={false} className="profile-edit-modal__header">
            <div className="d-flex align-items-center w-100 gap-2">
              {modalPanel === "security" ? (
                <button
                  type="button"
                  className="profile-edit-modal__icon-btn"
                  onClick={goToProfilePanel}
                  aria-label="Wróć do edycji profilu"
                  disabled={pwdLoading || emailLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8" />
                  </svg>
                </button>
              ) : (
                <span className="profile-edit-modal__header-spacer" aria-hidden="true" />
              )}
              <Modal.Title className="flex-grow-1 mb-0 fs-5">
                {modalPanel === "security" ? "Bezpieczeństwo" : "Edytuj profil"}
              </Modal.Title>
              {modalPanel === "profile" && (
                <button
                  type="button"
                  className="profile-edit-modal__icon-btn"
                  onClick={goToSecurityPanel}
                  aria-label="Ustawienia bezpieczeństwa"
                  disabled={saveLoading || avatarLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="btn-close"
                aria-label="Zamknij"
                onClick={closeEditModal}
                disabled={saveLoading || avatarLoading || pwdLoading || emailLoading}
              />
            </div>
          </Modal.Header>

          <Modal.Body>
            {modalMsg && modalMsgVariant === "success" && (
              <Alert variant="success" className="py-2 mb-3">
                {modalMsg}
              </Alert>
            )}

            {modalPanel === "profile" ? (
              <Form id="profile-edit-form" onSubmit={handleSaveProfile}>
                <div className="text-center mb-4">
                  <div className="position-relative d-inline-block">
                    <EditableProfileAvatar
                      imageUrl={displayImageUrl}
                      size={88}
                      onEdit={() => avatarInputRef.current?.click()}
                      disabled={avatarLoading}
                    />
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="d-none"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarChange(file);
                      e.target.value = "";
                    }}
                  />
                  <div className="small text-muted mt-2">
                    Najedź na zdjęcie i kliknij, aby zmienić (max 2 MB)
                  </div>
                  {avatarLoading && (
                    <div className="mt-2">
                      <Spinner size="sm" animation="border" /> Wgrywanie…
                    </div>
                  )}
                  {formErrors.getError("avatar") ? (
                    <div className="invalid-feedback d-block mt-2">{formErrors.getError("avatar")}</div>
                  ) : null}
                </div>

                <FormField label="Nazwa użytkownika" error={formErrors.getError("username")}>
                  <Form.Control
                    {...formErrors.bindText("username", editUsername, setEditUsername)}
                    required
                  />
                </FormField>
                <FormField label="O mnie" error={formErrors.getError("bio")} className="mb-0">
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={editBio}
                    onChange={(e) => {
                      formErrors.clearField("bio");
                      setEditBio(e.target.value);
                    }}
                    placeholder="Kilka słów o sobie…"
                    {...formErrors.controlProps("bio")}
                  />
                </FormField>
              </Form>
            ) : (
              <>
                <Form onSubmit={handleChangePassword} className="mb-4 pb-4 border-bottom" noValidate>
                  <h6 className="mb-3">Zmiana hasła</h6>
                  <FormField label="Obecne hasło" error={formErrors.getError("currentPassword")}>
                    <Form.Control
                      type="password"
                      {...formErrors.bindText("currentPassword", currentPassword, setCurrentPassword)}
                      autoComplete="current-password"
                    />
                  </FormField>
                  <FormField label="Nowe hasło" error={formErrors.getError("newPassword")}>
                    <Form.Control
                      type="password"
                      {...formErrors.bindText("newPassword", newPassword, setNewPassword)}
                      autoComplete="new-password"
                    />
                  </FormField>
                  <FormField label="Powtórz nowe hasło" error={formErrors.getError("confirmNewPassword")}>
                    <Form.Control
                      type="password"
                      {...formErrors.bindText(
                        "confirmNewPassword",
                        confirmNewPassword,
                        setConfirmNewPassword,
                      )}
                      autoComplete="new-password"
                    />
                  </FormField>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={pwdLoading}
                  >
                    {pwdLoading ? "Zapisywanie…" : "Zmień hasło"}
                  </Button>
                </Form>

                <Form onSubmit={handleRequestEmailChange} noValidate>
                  <h6 className="mb-3">Zmiana adresu email</h6>
                  <FormField label="Obecny email">
                    <Form.Control
                      type="email"
                      value={currentUser?.email ?? ""}
                      readOnly
                      plaintext
                      className="text-body-secondary"
                    />
                  </FormField>
                  <FormField label="Nowy email" error={formErrors.getError("newEmail")}>
                    <Form.Control
                      type="email"
                      value={newEmail}
                      onChange={(e) => {
                        formErrors.clearField("newEmail");
                        setNewEmail(e.target.value);
                      }}
                      autoComplete="email"
                      disabled={emailChangeSent}
                      {...formErrors.controlProps("newEmail")}
                    />
                  </FormField>
                  <FormField label="Hasło (potwierdzenie)" error={formErrors.getError("emailChangePassword")}>
                    <Form.Control
                      type="password"
                      value={emailChangePassword}
                      onChange={(e) => {
                        formErrors.clearField("emailChangePassword");
                        setEmailChangePassword(e.target.value);
                      }}
                      autoComplete="current-password"
                      disabled={emailChangeSent}
                      {...formErrors.controlProps("emailChangePassword")}
                    />
                  </FormField>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={emailLoading || emailChangeSent}
                  >
                    {emailLoading ? "Wysyłanie…" : "Wyślij link potwierdzający"}
                  </Button>
                  {emailChangeSent && (
                    <p className="small text-muted mt-3 mb-0">
                      Sprawdź skrzynkę nowego adresu i kliknij link w wiadomości.
                    </p>
                  )}
                </Form>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            {modalPanel === "profile" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={closeEditModal}
                  disabled={saveLoading || avatarLoading}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  form="profile-edit-form"
                  disabled={saveLoading || avatarLoading}
                >
                  {saveLoading ? "Zapisywanie…" : "Zapisz profil"}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={closeEditModal}
                disabled={pwdLoading || emailLoading}
              >
                Zamknij
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
}

export default ProfilePage;
