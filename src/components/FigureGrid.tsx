/**
 * The artwork: a grid of small figures that start standing at the top and end
 * up dancing at the bottom. Poses are generated rather than drawn, so the grid
 * can be any size and no two figures repeat.
 *
 * Every value is derived from the cell's own coordinates — deterministic, never
 * Math.random, since a random pose would differ between the server and client
 * renders and break hydration.
 */

/* Square cells, so a 10x10 grid is a square cover. */
const CELL_W = 26;
const CELL_H = 26;

/** Stable pseudo-random in 0..1 for one cell and one purpose. */
function noise(row: number, col: number, salt: number): number {
  const n = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Endpoint of a limb of `length` leaving `(x, y)` at `deg` (0 = right, 90 = down). */
function tip(x: number, y: number, length: number, deg: number): [number, number] {
  return [x + length * Math.cos(rad(deg)), y + length * Math.sin(rad(deg))];
}

/**
 * Energy across the grid. The first couple of rows hold still and the rise
 * accelerates after that, so the top reads as a crowd standing and the bottom
 * as the same crowd mid-dance. A per-figure jitter keeps a row from looking
 * like one pose stamped ten times.
 */
function energyAt(row: number, col: number, rows: number): number {
  if (rows <= 1) return 0;
  const down = row / (rows - 1);
  const ramp = Math.max(0, (down - 0.16) / 0.84) ** 1.25;
  return Math.min(1, ramp * (0.72 + noise(row, col, 6) * 0.42));
}

function Figure({ row, col, rows }: { row: number; col: number; rows: number }) {
  const energy = energyAt(row, col, rows);

  // Arms swing from hanging down all the way overhead; legs from together to a kick.
  const leftArm = 108 + noise(row, col, 1) * energy * 172;
  const rightArm = 72 - noise(row, col, 2) * energy * 172;
  const leftLeg = 96 + noise(row, col, 3) * energy * 62;
  const rightLeg = 84 - noise(row, col, 4) * energy * 62;
  const lean = (noise(row, col, 5) - 0.5) * energy * 26;
  const hop = -noise(row, col, 7) * energy * 1.8;

  const shoulder: [number, number] = [13, 10.4];
  const hip: [number, number] = [13, 16];
  const armLength = 7;
  const legLength = 7.8;

  return (
    <g
      transform={`translate(0 ${hop.toFixed(2)}) rotate(${lean.toFixed(2)} 13 14)`}
      strokeLinecap="round"
      strokeWidth={3.7}
      stroke="currentColor"
      fill="none"
    >
      <circle cx="13" cy="5" r="3.25" fill="currentColor" stroke="none" />
      <line x1="13" y1="8.2" x2={hip[0]} y2={hip[1]} />
      <line x1={shoulder[0]} y1={shoulder[1]} x2={tip(...shoulder, armLength, leftArm)[0]} y2={tip(...shoulder, armLength, leftArm)[1]} />
      <line x1={shoulder[0]} y1={shoulder[1]} x2={tip(...shoulder, armLength, rightArm)[0]} y2={tip(...shoulder, armLength, rightArm)[1]} />
      <line x1={hip[0]} y1={hip[1]} x2={tip(...hip, legLength, leftLeg)[0]} y2={tip(...hip, legLength, leftLeg)[1]} />
      <line x1={hip[0]} y1={hip[1]} x2={tip(...hip, legLength, rightLeg)[0]} y2={tip(...hip, legLength, rightLeg)[1]} />
    </g>
  );
}

export function FigureGrid({
  rows = 10,
  cols = 10,
  className = "",
  animate = true,
  style,
}: {
  rows?: number;
  cols?: number;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}) {
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push(
        <g
          key={`${row}-${col}`}
          className={animate ? "figure" : undefined}
          // A diagonal sweep, capped so a large grid never feels slow to arrive.
          style={animate ? { animationDelay: `${Math.min((row + col) * 26, 900)}ms` } : undefined}
          transform={`translate(${col * CELL_W} ${row * CELL_H})`}
        >
          <Figure row={row} col={col} rows={rows} />
        </g>,
      );
    }
  }

  return (
    <svg
      viewBox={`-4 -4 ${cols * CELL_W + 8} ${rows * CELL_H + 8}`}
      className={className}
      style={style}
      role="img"
      aria-label="A grid of figures, standing at the top and dancing at the bottom"
    >
      {cells}
    </svg>
  );
}

/** The sleeve in its frame — the shape the whole design is built around. */
export function CoverArt({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] bg-[var(--color-art)] p-4 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.65)] ${className}`}
    >
      <FigureGrid rows={10} cols={10} className="w-full text-[var(--color-art-ink)]" />
    </div>
  );
}

/**
 * A small pressing of the same sleeve, for places showing more than one
 * playlist at a time. Takes its colours explicitly so two of them can sit side
 * by side in different colourways.
 */
export function MiniSleeve({
  art,
  ink,
  size = 4,
  className = "",
}: {
  art: string;
  ink: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg p-1 ${className}`}
      style={{ backgroundColor: art }}
    >
      <FigureGrid rows={size} cols={size} animate={false} className="h-full w-full" style={{ color: ink }} />
    </div>
  );
}
