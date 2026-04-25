import gripenSilhouette from "@/assets/gripen-silhouette.png";

const SILHOUETTE_ASPECT_RATIO = 329 / 542;

export function AircraftIcon({
  size,
  angle,
  color,
}: {
  size: number;
  angle: number;
  color: string;
}) {
  const height = Math.round(size * SILHOUETTE_ASPECT_RATIO);

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height,
        backgroundColor: color,
        transform: `rotate(${angle}deg)`,
        filter: `drop-shadow(0 0 4px ${color})`,
        WebkitMaskImage: `url(${gripenSilhouette})`,
        WebkitMaskSize: "contain",
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        maskImage: `url(${gripenSilhouette})`,
        maskSize: "contain",
        maskPosition: "center",
        maskRepeat: "no-repeat",
      }}
    />
  );
}
