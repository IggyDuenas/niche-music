/**
 * Drifting cloud layer behind everything. The clouds are declared as fixed data
 * rather than generated randomly so the server and client render identically —
 * random values here would cause a hydration mismatch.
 *
 * Depth comes from three things moving together: clouds further "back" are
 * smaller, dimmer, more blurred and slower.
 */
const CLOUDS = [
  { top: "8%", scale: 1.0, opacity: 0.1, blur: 5, duration: 150, delay: -20 },
  { top: "18%", scale: 1.7, opacity: 0.13, blur: 3, duration: 105, delay: -70 },
  { top: "31%", scale: 0.8, opacity: 0.08, blur: 7, duration: 190, delay: -130 },
  { top: "44%", scale: 2.1, opacity: 0.11, blur: 2, duration: 85, delay: -45 },
  { top: "57%", scale: 1.2, opacity: 0.09, blur: 5, duration: 135, delay: -95 },
  { top: "69%", scale: 1.9, opacity: 0.12, blur: 3, duration: 95, delay: -15 },
  { top: "80%", scale: 0.9, opacity: 0.07, blur: 8, duration: 175, delay: -110 },
  { top: "90%", scale: 2.4, opacity: 0.1, blur: 2, duration: 78, delay: -60 },
];

function CloudShape() {
  return (
    <svg width="220" height="80" viewBox="0 0 220 80" aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="62" cy="52" rx="52" ry="24" />
        <ellipse cx="104" cy="38" rx="42" ry="30" />
        <ellipse cx="146" cy="50" rx="44" ry="22" />
        <ellipse cx="120" cy="58" rx="60" ry="18" />
      </g>
    </svg>
  );
}

export function Sky() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-[#cfd0ff]"
    >
      {CLOUDS.map((cloud, index) => (
        <div
          key={index}
          className="cloud"
          style={{
            top: cloud.top,
            opacity: cloud.opacity,
            filter: `blur(${cloud.blur}px)`,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <div style={{ transform: `scale(${cloud.scale})` }}>
            <CloudShape />
          </div>
        </div>
      ))}
      {/* Fades the clouds out behind the content so text stays readable. */}
      <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(10,10,24,0.72),transparent_78%)]" />
    </div>
  );
}
