import { cn } from "@/lib/utils";

/** Tiny inline trend line with a soft gradient fill (pure SVG, no runtime). */
export function Sparkline({
  data,
  className,
  stroke = "currentColor",
  width = 96,
  height = 40,
  id,
}: {
  data: number[];
  className?: string;
  stroke?: string;
  width?: number;
  height?: number;
  id: string;
}) {
  const points = data.filter((n) => Number.isFinite(n));
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const pad = 3;
  const step = (width - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => [pad + i * step, height - pad - ((v - min) / span) * (height - pad * 2)] as const);
  // smooth curve using quadratic midpoints
  let d = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 1; i < coords.length; i++) {
    const [px, py] = coords[i - 1];
    const [cx, cy] = coords[i];
    const mx = (px + cx) / 2;
    d += ` Q ${px} ${py} ${mx} ${(py + cy) / 2}`;
    if (i === coords.length - 1) d += ` T ${cx} ${cy}`;
  }
  const area = `${d} L ${coords[coords.length - 1][0]} ${height} L ${coords[0][0]} ${height} Z`;
  const gid = `spark-${id}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={cn("shrink-0 overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
