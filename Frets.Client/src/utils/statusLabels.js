export const STATUS_LABELS = {
  draft: "Szkic",
  pending: "Oczekuje",
  approved: "Zatwierdzona",
  rejected: "Odrzucona",
};

export const STATUS_VARIANTS = {
  draft: "secondary",
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export const SUGGESTION_STATUS_LABELS = {
  pending: "Oczekuje",
  approved: "Zatwierdzona",
  rejected: "Odrzucona",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

export function statusVariant(status) {
  return STATUS_VARIANTS[status] ?? "secondary";
}
