type Props = { onPick: (lat: number, lng: number) => void };
export function MapPinPicker({ onPick }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      Carte pin à brancher avec Google Maps/Leaflet. Pour tester, vous pouvez simuler Sfax.
      <div className="mt-3"><button className="rounded-xl border px-3 py-2" onClick={() => onPick(34.7406, 10.7603)}>Utiliser point test Sfax</button></div>
    </div>
  );
}
