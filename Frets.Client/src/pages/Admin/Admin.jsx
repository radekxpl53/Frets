import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRef } from "react";
import {
  Alert, Badge, Button, Card, Col, Container,
  Form, Modal, Nav, Row, Spinner,
} from "react-bootstrap";
import api from "../../api/client";
import AdminActionBar from "../../components/AdminActionBar";
import { statusLabel, statusVariant as statusVar } from "../../utils/statusLabels";
import EditableProfileAvatar from "../../components/EditableProfileAvatar";
import { formatVoteCounts } from "../../components/VotePanel";
import slugify from "../../utils/slugify";
import { getApiError, getSongId } from "../../utils/apiError";

// ─── Songs tab ────────────────────────────────────────────────────────────────

function SongsTab() {
  const [songs,        setSongs]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [actionId,     setActionId]     = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [error,        setError]        = useState("");
  const [message,      setMessage]      = useState("");

  const load = async (status) => {
    setLoading(true);
    setError("");
    try {
      const params = status ? { status } : {};
      const res = await api.get("/admin/songs", { params });
      setSongs(res.data ?? []);
    } catch (err) {
      setError(getApiError(err, "Nie udało się pobrać piosenek."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const act = async (song, action) => {
    const id = getSongId(song);
    if (!id) { setError("Brak ID piosenki."); return; }
    setMessage(""); setError(""); setActionId(id);
    try {
      await api.post(`/admin/songs/${id}/${action}`);
      const labels = { approve: "Zatwierdzono", reject: "Odrzucono", pending: "Cofnięto do oczekujących" };
      setMessage(`${labels[action] ?? "Zaktualizowano"}: ${song.title}`);
      await load(statusFilter);
    } catch (err) {
      setError(getApiError(err, "Operacja nie powiodła się."));
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <div className="d-flex align-items-end gap-3 mb-3 flex-wrap">
        <Form.Group style={{ minWidth: 200 }}>
          <Form.Label className="small text-muted mb-1">Status</Form.Label>
          <Form.Select
            size="sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Wszystkie</option>
            <option value="draft">Szkice</option>
            <option value="pending">Oczekujące</option>
            <option value="approved">Zatwierdzone</option>
            <option value="rejected">Odrzucone</option>
          </Form.Select>
        </Form.Group>
        <span className="text-muted small mb-1">{songs.length} piosenek</span>
      </div>

      {error   && <Alert variant="danger"  onClose={() => setError("")}   dismissible>{error}</Alert>}
      {message && <Alert variant="success" onClose={() => setMessage("")} dismissible>{message}</Alert>}

      {loading ? (
        <div className="text-center mt-5"><Spinner animation="border" /></div>
      ) : songs.length === 0 ? (
        <p className="text-muted">Brak piosenek w tym filtrze.</p>
      ) : (
        <Row className="g-3">
          {songs.map((song) => {
            const id      = getSongId(song);
            const busy    = actionId === id;
            const href    = song.status === "approved"
              ? `/songs/${song.artistSlug ?? slugify(song.artist)}/${slugify(song.title)}`
              : `/drafts/${song.artistSlug ?? slugify(song.artist)}/${slugify(song.title)}`;

            return (
              <Col md={6} lg={4} key={id}>
                <Card className="h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <Card.Title className="fs-6 mb-0">{song.title}</Card.Title>
                      <Badge bg={statusVar(song.status)} className="ms-2 flex-shrink-0">
                        {statusLabel(song.status)}
                      </Badge>
                    </div>
                    <Card.Subtitle className="text-muted mb-2" style={{ fontSize: "0.85rem" }}>
                      {song.artist}
                    </Card.Subtitle>

                    <div className="d-flex gap-2 mb-2 flex-wrap align-items-center">
                      <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                        <i className="bi bi-person me-1" />{song.authorUsername}
                      </span>
                      {(song.positiveVoteWeight > 0 || song.negativeVoteWeight > 0) && (
                        <span className="text-muted ms-auto" style={{ fontSize: "0.78rem" }}>
                          {formatVoteCounts(song.positiveVoteWeight, song.negativeVoteWeight)}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto">
                      <Button
                        size="sm" variant="outline-primary" as={Link} to={href}
                        className="mt-2"
                      >
                        <i className="bi bi-box-arrow-up-right me-1" />Otwórz
                      </Button>
                      <AdminActionBar
                        disabled={busy}
                        actions={[
                          ...(song.status !== "approved" ? [{
                            label: "Zatwierdź",
                            icon: "bi-check-lg",
                            variant: "success",
                            onClick: () => act(song, "approve"),
                          }] : []),
                          ...(song.status !== "rejected" ? [{
                            label: "Odrzuć",
                            icon: "bi-x-lg",
                            variant: "outline-danger",
                            onClick: () => act(song, "reject"),
                          }] : []),
                          ...((song.status === "approved" || song.status === "rejected") ? [{
                            label: "Wróć do pending",
                            icon: "bi-arrow-counterclockwise",
                            variant: "outline-secondary",
                            onClick: () => act(song, "pending"),
                          }] : []),
                        ]}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </>
  );
}

// ─── Artists tab ──────────────────────────────────────────────────────────────

function ArtistsTab() {
  const [artists,     setArtists]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error,       setError]       = useState("");
  const [message,     setMessage]     = useState("");
  const [search,      setSearch]      = useState("");
  const fileInputRefs = useRef({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => (a.name ?? "").toLowerCase().includes(q));
  }, [artists, search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/artists");
      setArtists(res.data ?? []);
    } catch (err) {
      setError(getApiError(err, "Nie udało się pobrać artystów."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleImage = async (artistId, file) => {
    if (!file) return;
    setMessage(""); setError(""); setUploadingId(artistId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/admin/artists/${artistId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Zaktualizowano zdjęcie artysty.");
      await load();
    } catch (err) {
      setError(getApiError(err, "Nie udało się wgrać zdjęcia."));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <>
      {error   && <Alert variant="danger"  onClose={() => setError("")}   dismissible>{error}</Alert>}
      {message && <Alert variant="success" onClose={() => setMessage("")} dismissible>{message}</Alert>}

      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <Form.Control
          type="search"
          size="sm"
          placeholder="Szukaj artysty…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <span className="text-muted small">{filtered.length} artystów</span>
      </div>

      {loading ? (
        <div className="text-center mt-5"><Spinner animation="border" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted">{search ? "Brak artystów pasujących do wyszukiwania." : "Brak artystów."}</p>
      ) : (
        <Row className="g-3">
          {filtered.map((artist) => (
            <Col md={6} lg={4} key={artist.id}>
              <Card>
                <Card.Body className="text-center">
                  <div className="position-relative d-inline-block mb-2">
                    <EditableProfileAvatar
                      imageUrl={artist.imageUrl}
                      size={72}
                      disabled={uploadingId === artist.id}
                      onEdit={() => fileInputRefs.current[artist.id]?.click()}
                    />
                    {uploadingId === artist.id && (
                      <div
                        className="position-absolute top-50 start-50 translate-middle"
                        style={{ pointerEvents: "none" }}
                      >
                        <Spinner animation="border" size="sm" variant="light" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={(el) => { fileInputRefs.current[artist.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="d-none"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImage(artist.id, f);
                      e.target.value = "";
                    }}
                  />
                  <Card.Title className="fs-6 mb-0">{artist.name}</Card.Title>
                  <small className="text-muted">{artist.songCount} piosenek</small>
                  <Button
                    size="sm" variant="outline-primary" className="mt-3 w-100"
                    as={Link} to={`/artists/${artist.slug}`}
                  >
                    <i className="bi bi-person-lines-fill me-1" />Zobacz profil
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [message,    setMessage]    = useState("");
  const [confirmId,  setConfirmId]  = useState(null); // ID usera do potwierdzenia usunięcia
  const [deletingId, setDeletingId] = useState(null);
  const [search,     setSearch]     = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.username ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data ?? []);
    } catch (err) {
      setError(getApiError(err, "Nie udało się pobrać użytkowników."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    try {
      await api.delete(`/admin/users/${confirmId}`);
      setMessage("Użytkownik został usunięty.");
      await load();
    } catch (err) {
      setError(getApiError(err, "Nie udało się usunąć użytkownika."));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmUser = users.find((u) => u.id === confirmId);

  return (
    <>
      {error   && <Alert variant="danger"  onClose={() => setError("")}   dismissible>{error}</Alert>}
      {message && <Alert variant="success" onClose={() => setMessage("")} dismissible>{message}</Alert>}

      {/* Modal potwierdzenia */}
      <Modal show={!!confirmId} onHide={() => setConfirmId(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Usuń użytkownika</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Czy na pewno chcesz usunąć konto{" "}
          <strong>{confirmUser?.username}</strong>? Operacja jest odwracalna (soft delete).
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)}>Anuluj</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>Usuń</Button>
        </Modal.Footer>
      </Modal>

      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <Form.Control
          type="search"
          size="sm"
          placeholder="Szukaj po nazwie lub emailu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <span className="text-muted small">{filtered.length} użytkowników</span>
      </div>

      {loading ? (
        <div className="text-center mt-5"><Spinner animation="border" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted">{search ? "Brak użytkowników pasujących do wyszukiwania." : "Brak użytkowników."}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Użytkownik</th>
                <th>Email</th>
                <th className="text-center">Rola</th>
                <th className="text-center">Poziom</th>
                <th className="text-center">XP</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link to={`/users/${u.slug}`} className="text-decoration-none fw-semibold">
                      {u.username}
                    </Link>
                  </td>
                  <td className="text-muted" style={{ fontSize: "0.85rem" }}>{u.email}</td>
                  <td className="text-center">
                    <Badge bg={u.role === "admin" ? "danger" : "secondary"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="text-center">{u.level}</td>
                  <td className="text-center">{u.xp}</td>
                  <td className="text-end">
                    <Button
                      size="sm" variant="outline-danger"
                      disabled={deletingId === u.id}
                      onClick={() => setConfirmId(u.id)}
                    >
                      <i className="bi bi-trash3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Panel główny ─────────────────────────────────────────────────────────────

export default function Admin() {
  const [tab, setTab] = useState("songs");

  return (
    <Container className="mt-4">
      <h2 className="mb-3">
        <i className="bi bi-shield-lock me-2 text-secondary" />
        Panel administratora
      </h2>

      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link active={tab === "songs"} onClick={() => setTab("songs")}>
            <i className="bi bi-music-note-list me-1" />Piosenki
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={tab === "users"} onClick={() => setTab("users")}>
            <i className="bi bi-people me-1" />Użytkownicy
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={tab === "artists"} onClick={() => setTab("artists")}>
            <i className="bi bi-person-badge me-1" />Artyści
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === "songs"   && <SongsTab />}
      {tab === "users"   && <UsersTab />}
      {tab === "artists" && <ArtistsTab />}
    </Container>
  );
}
