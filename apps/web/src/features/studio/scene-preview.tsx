import type { Scene } from "@atelier/domain";

/**
 * Aperçu statique d'une scène en SVG — utilisé par le comparateur
 * avant/après. Volontairement indépendant du canevas interactif
 * (`room-canvas.tsx`, react-konva) : un SVG se rend aussi bien côté serveur
 * que client, sans le coût du canevas complet pour un simple instantané.
 */
export function ScenePreview({ scene, size = 320 }: { scene: Scene; size?: number }) {
  const xs = scene.walls.flatMap((w) => [w.a.x, w.b.x]);
  const ys = scene.walls.flatMap((w) => [w.a.y, w.b.y]);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 400;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 300;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const padding = Math.max(width, height) * 0.08;

  return (
    <svg
      viewBox={`${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`}
      width={size}
      height={size}
      className="h-full w-full bg-[var(--surface)]"
      role="img"
      aria-label={`Aperçu de la pièce : ${scene.walls.length} murs, ${scene.furniture.length} meubles`}
    >
      {scene.walls.map((wall) => (
        <line
          key={wall.id}
          x1={wall.a.x}
          y1={wall.a.y}
          x2={wall.b.x}
          y2={wall.b.y}
          stroke="#57534e"
          strokeWidth={Math.max(wall.thickness, height / 60)}
          strokeLinecap="square"
        />
      ))}
      {scene.furniture.map((item) => (
        <rect
          key={item.id}
          x={item.position.x - item.footprint.w / 2}
          y={item.position.y - item.footprint.d / 2}
          width={item.footprint.w}
          height={item.footprint.d}
          fill="#e7ded1"
          stroke="#a8998a"
          transform={`rotate(${item.rotation} ${item.position.x} ${item.position.y})`}
        />
      ))}
    </svg>
  );
}
