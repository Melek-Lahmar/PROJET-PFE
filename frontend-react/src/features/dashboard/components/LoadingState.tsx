export function LoadingState() {
  return (
    <div className="pro-loading" aria-live="polite">
      <span className="pro-loading__hero" />
      {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
    </div>
  );
}
