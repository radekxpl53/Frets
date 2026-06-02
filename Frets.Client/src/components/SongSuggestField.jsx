import { useEffect, useId, useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import {
  fetchArtistSuggestions,
  fetchTitleSuggestions,
} from "../utils/songSuggestions";

function SongSuggestField({
  label,
  value,
  onChange,
  field,
  onPick,
  required = false,
  placeholder = "",
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results =
          field === "title"
            ? await fetchTitleSuggestions(q)
            : await fetchArtistSuggestions(q);
        if (!cancelled) setItems(results);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, field]);

  const showList = open && value.trim().length >= 2 && (loading || items.length > 0);

  const handlePick = (item) => {
    onPick(item, field);
    setOpen(false);
  };

  return (
    <Form.Group className="mb-3 position-relative">
      <Form.Label htmlFor={listId}>{label}</Form.Label>
      <Form.Control
        id={listId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
      />

      {showList && (
        <div
          className="list-group position-absolute w-100 mt-1 bg-white border rounded shadow"
          style={{ zIndex: 1050 }}
          role="listbox"
        >
          {loading && items.length === 0 ? (
            <div className="list-group-item bg-white border-0 px-3 py-2 text-muted small d-flex align-items-center gap-2">
              <Spinner size="sm" animation="border" />
              Szukam…
            </div>
          ) : (
            items.map((item) => {
              const label = field === "artist" ? item.artist : item.title;
              const key = field === "artist" ? `artist-${label}` : `title-${label}`;

              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  className="list-group-item list-group-item-action bg-white py-2 px-3 border-0 rounded-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(item)}
                >
                  {label}
                </button>
              );
            })
          )}
        </div>
      )}
    </Form.Group>
  );
}

export default SongSuggestField;
