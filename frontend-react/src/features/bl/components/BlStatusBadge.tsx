type Props = { status?: string | null };

function badgeClass(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "EN_ATTENTE":
      return "badge-warning";
    case "CONFIRME":
    case "LIVRE":
      return "badge-success";
    case "TENTATIVE":
      return "badge-info";
    case "REFUSE":
      return "badge-danger";
    default:
      return "badge-neutral";
  }
}

export function BlStatusBadge({ status }: Props) {
  const s = status && status.trim() ? status : "INCONNU";
  return (
    <span className={badgeClass(s) + " inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"}>
      {s}
    </span>
  );
}