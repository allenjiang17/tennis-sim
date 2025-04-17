import { useEffect, useState } from 'react';
import { TrajectoryPoint2D } from './utils/helper';


export default function TennisBallAnimation({trajectory, netX}: {trajectory: TrajectoryPoint2D[], netX: number}) {

  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (trajectory.length === 0) return;
  
    setFrame(0); // 🔥 reset to beginning
  
    const interval = setInterval(() => {
      setFrame((prev) => Math.min(prev + 1, trajectory.length - 1));
    }, 16);
  
    return () => clearInterval(interval);
  }, [trajectory]);

  const ball = trajectory[frame] || { d: 0, z: 0 };
  const scale = 17; // 1 meter = 20 units
  const maxLength = 30;
  const svgWidth = maxLength * scale;
  const svgHeight = 200;

  const scaledNetX = netX * scale; 

  return (
    <div style={{ textAlign: 'left' }}>
      <h4 style={{margin: '0 0 10px 0'}}>side view</h4>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ border: '1px solid black', background: '#A8D5BA' }}
        >
        {/* Net - 0.91m tall at center */}
        <line
            x1={scaledNetX}
            y1={svgHeight}
            x2={scaledNetX}
            y2={svgHeight - 0.91 * scale}
            stroke="white"
            strokeWidth={3}
        />
        <text
          x={scaledNetX}
          y={svgHeight - 0.91 * scale - 6} // slightly above the net
          fontSize={10}
          fill="white"
          textAnchor="middle"
        >
          Net
        </text>

        {/* Meter markers */}
        {Array.from({ length: Math.floor(maxLength) + 1 }, (_, i) => (
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
            cx={point.d * scale}
            cy={svgHeight - point.z * scale}
            r={2}
            fill="orange"
            opacity={0.3 + 0.7 * (i / trajectory.length)}
            />
        ))}

        {/* Ball */}
        <circle
            cx={ball.d * scale}
            cy={svgHeight - ball.z * scale}
            r={5}
            fill="yellow"
            stroke="black"
        />
        </svg>
    </div>
  );
}