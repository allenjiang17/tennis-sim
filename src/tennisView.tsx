import TennisCourt from "./tennisCourt"
import TennisBallAnimation from "./tennisSideView"
import { TrajectoryPoint3D, TrajectoryPoint2D } from "./utils/helper";
import { getNetDistanceAlongShotPath } from "./utils/helper";
import { useEffect, useState } from "react";


export type TennisViewProps = {
  playerTrajectory: TrajectoryPoint3D[];
  opponentTrajectory: TrajectoryPoint3D[];
  ballTrajectory3D: TrajectoryPoint3D[];
  ballTrajectory2D: TrajectoryPoint2D[];
  shotAngle: number;
};

export default function TennisView({
    playerTrajectory,
    opponentTrajectory,
    ballTrajectory3D,
    ballTrajectory2D,
    shotAngle,
}: TennisViewProps) {

    const playerPosition = playerTrajectory[playerTrajectory.length - 1];

    const [frame, setFrame] = useState(0);

    console.log({trajectory});
  
    useEffect(() => {
      if (trajectory.length === 0) return;
    
      setFrame(0); // 🔥 reset to beginning
    
      const interval = setInterval(() => {
        setFrame((prev) => Math.min(prev + 1, trajectory.length - 1));
      }, 16);
    
      return () => clearInterval(interval);
    }, [trajectory]);

    const ball = trajectory[frame] || { d: 0, z: 0 };

  

    return (
        <div>
            <TennisCourt
                playerTrajectory={playerTrajectory}
                opponentTrajectory={opponentTrajectory}
                ballTrajectory={ballTrajectory3D}
                shotAngle={shotAngle}
            />  
            <TennisBallAnimation 
                trajectory={ballTrajectory2D}
                netX={getNetDistanceAlongShotPath(playerPosition, shotAngle)}
            />    
        </div>
    )
}