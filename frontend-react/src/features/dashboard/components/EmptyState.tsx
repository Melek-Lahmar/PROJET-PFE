export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pro-empty">
      <div className="pro-empty__icon">∅</div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
