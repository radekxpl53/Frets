import { Card } from "react-bootstrap";
import Skeleton from "./Skeleton";

/**
 * Szkielet karty podczas ładowania.
 * variant: "text" (tytuł + meta) lub "avatar" (wyśrodkowany awatar + tekst).
 */
function SkeletonCard({ variant = "text" }) {
  if (variant === "avatar") {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex flex-column align-items-center">
          <Skeleton width={88} height={88} rounded className="mb-3" />
          <Skeleton width="60%" height={14} className="mb-2" />
          <Skeleton width="40%" height={10} />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Body>
        <Skeleton width="75%" height={16} className="mb-2" />
        <Skeleton width="45%" height={11} className="mb-4" />
        <Skeleton width="30%" height={20} />
      </Card.Body>
    </Card>
  );
}

export default SkeletonCard;
