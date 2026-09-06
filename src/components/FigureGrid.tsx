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
 * Energy across the grid: the top of the field is calmer and the bottom is
 * mid-dance. A per-figure jitter keeps a row from looking like one pose stamped
 * across it.
 */

/** How much of the grid stays near-calm before the rise begins. */
const STILL_SHARE = 0.04;
/**
 * Nobody stands completely still. Without a floor the whole top of the field
 * reads as a queue rather than a crowd, and on a tall grid that is a lot of
 * motionless figures.
 */
const MIN_ENERGY = 0.32;

function energyAt(row: number, col: number, rows: number): number {
  if (rows <= 1) return MIN_ENERGY;
  const down = row / (rows - 1);
  // Below 1, so the rise starts immediately rather than staying flat early on.
  const ramp = Math.max(0, (down - STILL_SHARE) / (1 - STILL_SHARE)) ** 0.85;
  const jitter = 0.78 + noise(row, col, 6) * 0.44;
  // The floor is jittered too, so the calm rows still vary against each other.
  const floor = MIN_ENERGY * (0.7 + noise(row, col, 8) * 0.6);
  return Math.min(1, Math.max(floor, ramp * jitter));
}

/**
 * How far one limb travels from its resting angle.
 *
 * The random part never scales the whole swing, only the top two thirds of it.
 * Multiplying the range by the raw value would let a figure whose numbers all
 * landed near zero snap back to the rest pose however energetic its row is,
 * which is what left scattered figures standing rigid in the middle of a dance.
 */
function swing(random: number, energy: number, range: number): number {
  return (0.4 + 0.6 * random) * energy * range;
}

function Figure({ row, col, rows }: { row: number; col: number; rows: number }) {
  const energy = energyAt(row, col, rows);

  // Arms swing from hanging down all the way overhead; legs from together to a kick.
  const leftArm = 108 + swing(noise(row, col, 1), energy, 172);
  const rightArm = 72 - swing(noise(row, col, 2), energy, 172);
  const leftLeg = 96 + swing(noise(row, col, 3), energy, 62);
  const rightLeg = 84 - swing(noise(row, col, 4), energy, 62);
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
  preserveAspectRatio,
}: {
  rows?: number;
  cols?: number;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
  preserveAspectRatio?: string;
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
      preserveAspectRatio={preserveAspectRatio}
      role="img"
      aria-label="A grid of figures, standing at the top and dancing at the bottom"
    >
      {cells}
    </svg>
  );
}

/**
 * The dancers as the room rather than as a picture on the wall: a full-bleed
 * field of figures behind everything, standing along the top and dancing by the
 * bottom.
 *
 * The SVG is scaled with `slice`, so the grid always covers the viewport and
 * crops at the edges instead of letterboxing or squashing the figures.
 */
export function FigureField({ rows = 20, cols = 28 }: { rows?: number; cols?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[var(--color-art)]">
      {/*
       * The grid is deliberately larger than any viewport. `slice` scales it to
       * cover and crops the overflow, which keeps each figure at roughly the
       * same size on a phone as on a desktop — a smaller grid would simply
       * enlarge the figures to fill a wide screen.
       *
       * Not animated: a stagger across 500-odd figures is a lot of work for a
       * backdrop, and the load should be calm rather than busy.
       */}
      <FigureGrid
        rows={rows}
        cols={cols}
        animate={false}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-[var(--color-art-ink)]"
      />
      {/*
       * Only a soft vignette. Legibility is handled by the plate the content
       * sits on rather than by dimming the field — darkening enough to read
       * cream text over dark figures would have washed the dancers out entirely,
       * and on the ochre pressing the figures are the dark element.
       */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_45%,rgba(0,0,0,0.3)_100%)]" />
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
