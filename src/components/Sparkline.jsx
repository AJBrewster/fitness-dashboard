// Small inline trend line for a KPI tile. Decorative alongside the tile's
// own text value (which already carries the number a screen reader needs),
// so it's aria-hidden rather than needing its own accessible description.
function Sparkline({ values }) {
  if (values.length < 2) return null;

  const width = 100;
  const height = 28;
  const padding = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return [x, y];
  });

  const linePath = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="sparkline-line" d={linePath} />
      <circle className="sparkline-dot" cx={lastX} cy={lastY} r="2" />
    </svg>
  );
}

export default Sparkline;
