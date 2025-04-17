import { Position, TrajectoryPoint2D, TrajectoryPoint3D, transformTrajectoryTo3D } from "./utils/helper";
import { useEffect, useState } from "react";

export type TennisCourtProps = {
  playerTrajectory: TrajectoryPoint3D[];
  opponentTrajectory: TrajectoryPoint3D[];
  ballTrajectory: TrajectoryPoint3D[];
  shotAngle: number;
};

export default function TennisCourt({
    playerTrajectory,
    opponentTrajectory,
    ballTrajectory,
    shotAngle,
  }: TennisCourtProps) {
    // SVG coordinate system
    const SVG_WIDTH = 200;
    const SVG_HEIGHT = 300;
    const SVG_X_0 = 100;
    const SVG_Y_0 = 150;

    //scale
    const scale = 10; // 1 meter = 10 svg units
  
    // Coordinate conversion (court meters → SVG coordinates)
    const toSvgX = (x: number) => SVG_X_0 + (x * scale);
    const toSvgY = (y: number) => SVG_Y_0 + (y * scale);

     const [frame, setFrame] = useState(0);
        
      useEffect(() => {
        setFrame(0); // 🔥 reset to beginning
      
        const interval = setInterval(() => {
          setFrame((prev) => Math.min(prev + 1, ballTrajectory.length - 1));
        }, 16);
      
        return () => clearInterval(interval);
      }, [ ballTrajectory]);

    
    const ballPosition = ballTrajectory[frame] || ballTrajectory[ballTrajectory.length - 1];
    const bounceIndex = ballTrajectory.findIndex(p => p.z <= 0);
    const bouncePoint = bounceIndex !== -1 ? ballTrajectory[bounceIndex] : null;
    
    const playerLocation = playerTrajectory[frame] || playerTrajectory[playerTrajectory.length - 1];
    const opponentLocation = opponentTrajectory[frame] || opponentTrajectory[opponentTrajectory.length - 1];

    const showLines =
    Math.hypot(ballPosition.x - playerLocation.x, ballPosition.y - playerLocation.y) <= 0.3;

    const endPoint = {d: 1000, z: 0, t: 0} as TrajectoryPoint2D;
    const zeroTargetEndLocation = transformTrajectoryTo3D(playerTrajectory[playerTrajectory.length - 1], [endPoint], 0)[0];
    const shotTargetEndLocation = transformTrajectoryTo3D(playerTrajectory[playerTrajectory.length - 1], [endPoint], shotAngle)[0];
  
    return (
      <div style={{ position: 'relative' }}>
        <svg width="600" height="900" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
            <title>Tennis Court</title>
            <g>
                <title>Court</title>
                <rect fill="#000000" fill-opacity="0" height="237.7" id="svg_2" stroke="#FFFFFF" stroke-width="1" width="82.3" x="58.19" y="31.5"/>
                <rect fill="#000000" fill-opacity="0" height="237.7" id="svg_3" stroke="#FFFFFF" stroke-width="1" width="109.7" x="44" y="31.5"/>
                <line id="svg_4" stroke="#FFFFFF"stroke-width="1" transform="matrix(1 0 0 1 0 0)" x1="44" x2="154" y1="150" y2="150"/>
                <line id="svg_5" stroke="#FFFFFF" stroke-width="1" x1="58.44" x2="141.6" y1="86" y2="86"/>
                <line id="svg_6" stroke="#FFFFFF" stroke-width="1" x1="58.54" x2="141.5" y1="214" y2="214"/>
                <line id="svg_7" stroke="#FFFFFF" stroke-width="1" x1="100" x2="100" y1="86" y2="214"/>
            </g>
  
            {/* Zero-angle line (yellow) */}
            {showLines && <line
              x1={toSvgX(playerLocation.x)}
              y1={toSvgY(playerLocation.y)}
              x2={toSvgX(zeroTargetEndLocation.x)}
              y2={toSvgY(zeroTargetEndLocation.y)}
              stroke="pink"
              strokeWidth="0.8"
            />
          }
  
            {/* Shot angle line (red) */}
            {showLines && <line
              x1={toSvgX(playerLocation.x)}
              y1={toSvgY(playerLocation.y)}
              x2={toSvgX(shotTargetEndLocation.x)}
              y2={toSvgY(shotTargetEndLocation.y)}
              stroke="red"
              strokeWidth="0.8"
            />
            }
            {bouncePoint && frame >= bounceIndex && (
                <circle
                    cx={toSvgX(bouncePoint.x)}
                    cy={toSvgY(bouncePoint.y)}
                    r={3}
                    fill="black"
                    opacity={0.8}
                />
            )}
  
            {/* Ball */}
            <text
              x={toSvgX(ballPosition.x)}
              y={toSvgY(ballPosition.y)}
              fontSize="6"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              🎾
            </text>
  
            {/* Player */}
            <text
              x={toSvgX(playerLocation.x)}
              y={toSvgY(playerLocation.y)}
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              🧍
            </text>
  
            {/* Opponent */}
            <text
              x={toSvgX(opponentLocation.x)}
              y={toSvgY(opponentLocation.y)}
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              🤖
            </text>
        </svg>
      </div>
    );
  }