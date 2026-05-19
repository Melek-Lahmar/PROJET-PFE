export function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) {
  return (
    <div className="pro-error" role="alert">
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry ? <button type="button" onClick={onRetry}>Réessayer</button> : null}
    </div>
  );
}
