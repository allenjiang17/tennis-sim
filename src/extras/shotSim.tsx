import { useEffect, useState } from 'react';

function simulateTennisShotWithBounce({
  initialVx,
  initialVy,
  spin,
  initialHeight = 1.0,
  dt = 0.01,
  duration = 5.0,
}) {
  const g = 9.81;
  const m = 0.057;
  const k_d = 0.00005;
  const k_m = 0.00005;
  const energyLoss = 0.8;
  const frictionLoss = 0.90;

  const courtMinX = -5;
  const courtMaxX = 28;

  const result = [];

  let x = 0;
  let y = initialHeight;
  let vx = initialVx;
  let vy = initialVy;
  let t = 0;

  while (
    t < duration &&
    x >= courtMinX &&
    x <= courtMaxX
  ) {
    const speed = Math.sqrt(vx ** 2 + vy ** 2) || 0.001;
    const Fd_x = -k_d * vx * (speed ** 2);
    const Fd_y = -k_d * vy * (speed ** 2);
    const Fm_x = k_m * spin * vy;
    const Fm_y = -k_m * spin * vx;

    const ax = (Fd_x + Fm_x) / m;
    const ay = (Fd_y + Fm_y - m * g) / m;

    vx += ax * dt;
    vy += ay * dt;

    x += vx * dt;
    y += vy * dt;

    if (y <= 0 && vy < 0) {
      y = 0;
      vy = -vy * energyLoss;
      vx *= frictionLoss;
    }

    result.push({ x, y, t });
    t += dt;
  }

  return result;
}

export default function TennisBallAnimation() {
  const [power, setPower] = useState(22); // mph (convert to m/s)
  const [spin, setSpin] = useState(60);   // rpm-like
  const [angle, setAngle] = useState(10); // degrees
  const [trajectory, setTrajectory] = useState([]);
  const [frame, setFrame] = useState(0);

  const simulate = () => {
    const angleRad = (angle * Math.PI) / 180;
    const vx = power * 0.447 * Math.cos(angleRad);
    const vy = power * 0.447 * Math.sin(angleRad);
    const result = simulateTennisShotWithBounce({
      initialVx: vx,
      initialVy: vy,
      spin: spin * (2 * Math.PI / 60), // Convert to rad/s
      initialHeight: 1.2,
    });
    setTrajectory(result);
    setFrame(0);
  };

  useEffect(() => {
    if (trajectory.length === 0) return;
    const interval = setInterval(() => {
      setFrame((prev) => Math.min(prev + 1, trajectory.length - 1));
    }, 16);
    return () => clearInterval(interval);
  }, [trajectory]);

  const ball = trajectory[frame] || { x: 0, y: 0 };
  const scale = 20; // 1 meter = 20 units
  const courtLength = 23.77;
  const svgWidth = courtLength * scale;
  const svgHeight = 200;

  const netX = 11.88 * scale;
  const opponentBaselineX = courtLength * scale;

  return (
    <div style={{ textAlign: 'center' }}>
      <h3>Tennis Ball Simulation</h3>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
        <div>
          <label>Power: {power.toFixed(1)} mph</label><br />
          <input type="range" min="0" max="100" step="0.1" value={power} onChange={(e) => setPower(+e.target.value)} />
        </div>
        <div>
          <label>Spin: {spin.toFixed(0)}</label><br />
          <input type="range" min="-2000" max="5000" step="200" value={spin} onChange={(e) => setSpin(+e.target.value)} />
        </div>
        <div>
          <label>Launch Angle: {angle.toFixed(1)}°</label><br />
          <input type="range" min="-10" max="60" step="1" value={angle} onChange={(e) => setAngle(+e.target.value)} />
        </div>
      </div>

      <button onClick={simulate} style={{ marginBottom: '1rem' }}>Simulate</button>

      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ border: '1px solid black', background: '#A8D5BA' }}
        >
        {/* Net - 0.91m tall at center */}
        <line
            x1={netX}
            y1={svgHeight}
            x2={netX}
            y2={svgHeight - 0.91 * scale}
            stroke="white"
            strokeWidth={3}
        />

        {/* Opponent baseline */}
        <line
            x1={opponentBaselineX}
            y1={0}
            x2={opponentBaselineX}
            y2={svgHeight}
            stroke="red"
            strokeWidth={2}
            strokeDasharray="4 2"
        />

        {/* Meter markers */}
        {Array.from({ length: Math.floor(courtLength) + 1 }, (_, i) => (
            <g key={i}>
            <line x1={i * scale} y1={svgHeight - 10} x2={i * scale} y2={svgHeight} stroke="black" />
            <text x={i * scale} y={svgHeight - 14} fontSize={8} textAnchor="middle">{i}</text>
            </g>
        ))}
        {Array.from({ length: Math.floor(svgHeight / scale) + 1 }, (_, i) => (
            <g key={`y-${i}`}>
                <line
                x1={0}
                y1={svgHeight - i * scale}
                x2={5}
                y2={svgHeight - i * scale}
                stroke="black"
                />
                <text
                x={8}
                y={svgHeight - i * scale + 3}
                fontSize={8}
                fill="black"
                >
                {i}
                </text>
            </g>
            ))}

        {/* Ball trail */}
        {trajectory.slice(0, frame).map((point, i) => (
            <circle
            key={i}
            cx={point.x * scale}
            cy={svgHeight - point.y * scale}
            r={2}
            fill="orange"
            opacity={0.3 + 0.7 * (i / trajectory.length)}
            />
        ))}

        {/* Ball */}
        <circle
            cx={ball.x * scale}
            cy={svgHeight - ball.y * scale}
            r={5}
            fill="yellow"
            stroke="black"
        />
        </svg>
    </div>
  );
}