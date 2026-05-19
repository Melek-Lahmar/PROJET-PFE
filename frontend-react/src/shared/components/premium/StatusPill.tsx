import { statusVisual } from "./statusPalette";

interface StatusPillProps {
  /** Numeric domain status (1..6). Same semantics as Flutter Statut enum. */
  statut?: number | null;
  /** Optional API string status — short-circuits to "pending" when CONFIRME/EN_ATTENTE. */
  apiStatus?: string | null;
  /** Override the displayed label (defaults to the palette's label). */
  label?: string;
  /** Hide the icon when only the chip text is wanted. */
  iconOnly?: boolean;
  showIcon?: boolean;
  /**
   * Mode "important" : ajoute un halo pulsé Flutter-like. Idéal pour les
   * status qui demandent l'attention (REPORTE en cours, TENTATIVE, REFUSE).
   */
  pulse?: boolean;
  className?: string;
}

export function StatusPill({
  statut,
  apiStatus,
  label,
  iconOnly = false,
  showIcon = true,
  pulse = false,
  className = "",
}: StatusPillProps) {
  const visual = statusVisual(statut, apiStatus);
  const display = label ?? visual.label;
  const pulseClass = pulse ? "anim-pulse-glow" : "";

  return (
    <span
      className={`${visual.pillClass} ${pulseClass} ${className}`.trim()}
      data-status={visual.variant}
    >
      {showIcon && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {visual.iconPath
            .split(" M")
            .map((seg, i) => (
              <path key={i} d={i === 0 ? seg : `M${seg}`} />
            ))}
        </svg>
      )}
      {!iconOnly && <span>{display}</span>}
    </span>
  );
}
