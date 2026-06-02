import { Button } from "react-bootstrap";

export function formatVoteCounts(positive = 0, negative = 0) {
  const total = positive + negative;
  if (total === 0) return "Brak głosów";
  return `Za: ${positive} · Przeciw: ${negative} (waga łącznie: ${total})`;
}

function VotePanel({
  positive = 0,
  negative = 0,
  userVote = null,
  canVote = false,
  onVote,
  loading = false,
  showButtons = true,
}) {
  return (
    <div>
      <div className="small text-muted mb-2">{formatVoteCounts(positive, negative)}</div>
      {showButtons && canVote && onVote && (
        <div className="d-flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={userVote === true ? "success" : "outline-success"}
            disabled={loading}
            onClick={() => onVote(true)}
          >
            Głosuj za
          </Button>
          <Button
            size="sm"
            variant={userVote === false ? "danger" : "outline-danger"}
            disabled={loading}
            onClick={() => onVote(false)}
          >
            Głosuj przeciw
          </Button>
        </div>
      )}
    </div>
  );
}

export default VotePanel;
