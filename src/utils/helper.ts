import { COURT_WIDTH, COURT_LENGTH, MPH_TO_MPS, NET_POSITION_ALONG_LENGTH, SERVE_POSITION_DIFF, RETURN_POSITION_DIFF, SERVE_BOX_LENGTH } from "./constants";
import {G as g, M as m, K_D as k_d, K_M as k_m, ENERGY_LOSS as energyLoss, FRICTION_LOSS as frictionLoss, NET_HEIGHT as netHeight}  from "./constants";

//this is a point along a single ball trajectory
export type TrajectoryPoint2D = {
  d: number; //distance along strike path
  z: number; //height
  t: number;
};

export type TrajectoryPoint3D = {
    x: number;
    y: number;
    z: number;
    t: number;
  };

export type Position = {
    x: number;
    y: number;
}

export type Vector = {
    x: number;
    y: number;
}

export type ShotResult = {
    bouncePoint: TrajectoryPoint3D;
    strikePoint: TrajectoryPoint3D;
    error: boolean;
    miss: boolean;
    trajectory2D: TrajectoryPoint2D[];
    trajectory3D: TrajectoryPoint3D[];
}

    export function simulateTennisShotWithBounce({
        initialVd,
        initialVz,
        spin,
        initialHeight = 1.0,
        dt = 0.01,
        duration = 4.0,
        netD = 11.88,
    }: {
        initialVd: number;
        initialVz: number;
        spin: number;
        initialHeight?: number;
        dt?: number;
        duration?: number;
        netD?: number;
    }): {
        trajectory: TrajectoryPoint2D[];
        bouncePoint: TrajectoryPoint2D;
        strikePoint: TrajectoryPoint2D; //simplistic for now, assume strike point is 0.5 seconds after bounce
        netError: boolean;
    } {

        const result = [];

        let d = 0;
        let z = initialHeight;
        let vd = initialVd;
        let vz = initialVz;
        let t = 0;

        let firstBouncePoint: TrajectoryPoint2D | null = null;
        let strikePoint: TrajectoryPoint2D | null = null;
        let durationAfterBounce = 20; //fixed for now, 
        let netError = false;

        while (
        t < duration
        ) {
        const speed = Math.sqrt(vd ** 2 + vz ** 2) || 0.001;
        const Fd_d = -k_d * vd * speed ** 2;
        const Fd_z = -k_d * vz * speed ** 2;
        const Fm_d = 0;
        const Fm_z = -k_m * spin * vd;

        const ax = (Fd_d + Fm_d) / m;
        const ay = (Fd_z + Fm_z - m * g) / m;

        vd += ax * dt;
        vz += ay * dt;

        d += vd * dt;
        z += vz * dt;

        // Check for net hit
        if (
            d >= netD - vd * dt && // just before crossing net
            d <= netD + vz * dt && // just after crossing net
            z <= netHeight
        ) {
            //stop rendering trajectory
            netError = true;
            break;
        }

        // Check for bounce
        if (firstBouncePoint === null && z <= 0 && vz < 0) {
            firstBouncePoint = { d, z, t };
        }

        if (z <= 0 && vz < 0) {
            z = 0;
            vz = -vz * energyLoss;
        
            // Spin-adjusted forward kick
            const spinInfluence = 0.001 * vd; // tweak based on realism
            vd = vd * frictionLoss + spin * spinInfluence;
        }
        
        
        if (firstBouncePoint !== null) {
            durationAfterBounce--;
        }

        if (durationAfterBounce === 0 && strikePoint === null) {
            strikePoint = { d, z, t };
        }

        result.push({ d, z, t });
        t += dt;
        }

        if (firstBouncePoint && firstBouncePoint.d <= netD) {
            netError = true;
        }

        return {
        trajectory: result,
        bouncePoint: firstBouncePoint ?? result[result.length - 1],
        strikePoint: strikePoint ?? result[result.length - 1],
        netError,
        };
    }

    export function calculateDistance(playerLocation: Position, target: Position) {
        const dx = target.x - playerLocation.x;
        const dy = target.y - playerLocation.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    export function calculateImpact(playerLocation: Position, target: Position, power: number) {
    const impactCoeff = 0.15; // Coefficient to adjust impact

    const dist = calculateDistance(playerLocation, target);
    const impact = (dist + 1)**2 * power * impactCoeff ; // +1 to ensure there's always some impact
    return impact;
    }
  
    export function calculateRun(
        playerLocation: Position,
        strikePosition: TrajectoryPoint3D,
        speed: number,
        dt = 0.01
      ): {
        reached: boolean;
        timeToBall: number;
        timeNeeded: number;
        finalLocation: Position;
        trajectory: TrajectoryPoint3D[];
      } {

        const distance = calculateDistance(playerLocation, {
          x: strikePosition.x,
          y: strikePosition.y,
        });
      
        const timeNeeded = distance / speed;
        const timeToBall = strikePosition.t;
      
        const reached = timeNeeded <= timeToBall;
      
        const trajectory: TrajectoryPoint3D[] = [];
      
        const directionX = (strikePosition.x - playerLocation.x) / distance;
        const directionY = (strikePosition.y - playerLocation.y) / distance;
      
        for (let t = 0; t <= timeNeeded; t += dt) {

          const moveDist = speed * t;
          trajectory.push({
            x: playerLocation.x + directionX * moveDist,
            y: playerLocation.y + directionY * moveDist,
            z: 0, // player stays on the ground
            t,
          });
        }

        if (timeToBall > timeNeeded) {
            //pad the trajectory with extra time waiting there for the ball to hit strike point
            for (let t = timeNeeded; t <= timeToBall; t += dt) {
                trajectory.push({
                    x: trajectory[trajectory.length - 1].x,
                    y: trajectory[trajectory.length - 1].y,
                    z: 0, // player stays on the ground
                    t,
                });
            }
        }

        if (timeToBall < timeNeeded) {
            //truncate the trajectory to timeToBall
            trajectory.splice(Math.floor(timeToBall / dt));
        }

        const finalLocation = {x: trajectory[trajectory.length - 1].x, y: trajectory[trajectory.length - 1].y};

        return { reached, timeToBall, timeNeeded, finalLocation, trajectory };
      }

    export function transformTrajectoryTo3D(
        playerLocation: Position,
        trajectory2D: TrajectoryPoint2D[],
        shotAngle: number
      ): TrajectoryPoint3D[] {

        const trajectory3D: TrajectoryPoint3D[] = [];
        const shotAngleVector = getShotAngleUnitVector(playerLocation, shotAngle);

        for (let point of trajectory2D) {
            trajectory3D.push({
                x: playerLocation.x + point.d * shotAngleVector.x,
                y: playerLocation.y + point.d * shotAngleVector.y,
                z: point.z,
                t: point.t,
            })

        }
      
        // Step 3: scale by targetY and translate from playerLocation
        return trajectory3D;
    }

    export function getShotAngleUnitVector(playerLocation: Position, shotAngle: number) : Vector {

        const netCenter: Position = { x: 0, y: 0 }; // center of net

         // Step 1: zero-angle unit direction vector (from player to net center)
         const dx0 = netCenter.x - playerLocation.x;
         const dy0 = netCenter.y - playerLocation.y;
         const length = Math.sqrt(dx0 ** 2 + dy0 ** 2);
         const ux = dx0 / length;
         const uy = dy0 / length;
       
         // Step 2: rotate this vector by shotAngle (convert degrees to radians)
         const angleRad = (shotAngle * Math.PI) / 180;
         const cosA = Math.cos(angleRad);
         const sinA = Math.sin(angleRad);
       
         const rotatedX = ux * cosA - uy * sinA;
         const rotatedY = ux * sinA + uy * cosA;

         return {x: rotatedX, y: rotatedY};

    }

    export function getNetDistanceAlongShotPath(playerLocation: Position, shotAngle: number): number {
        const shotAngleVector = getShotAngleUnitVector(playerLocation, shotAngle);

        let netDistance: number | null = null;
        if (shotAngleVector.y !== 0) {
          const s = Math.abs(playerLocation.y / shotAngleVector.y);

          if (s >= 0) netDistance = s;
        }

        return netDistance ?? 0;
    }

    export function isBallInCourt(ballPosition: Position): boolean {
        
        const ballWidthCheck = ballPosition.x < COURT_WIDTH/2 && ballPosition.x > -COURT_WIDTH/2;
        const ballLengthCheck = ballPosition.y < COURT_LENGTH/2 && ballPosition.y > -COURT_LENGTH/2;
        return ballWidthCheck && ballLengthCheck;
    }
    
    export function isBallInServeBox(ballPosition: Position, serveSide: 'ad' | 'deuce', servePlayer: 'player' | 'opponent'): boolean {

      let ballWidthCheck = ballPosition.x < COURT_WIDTH/2 && ballPosition.x > -COURT_WIDTH/2;

      if ( servePlayer === "player") {
        if (serveSide === "ad") {
          ballWidthCheck = ballPosition.x < COURT_WIDTH/2 && ballPosition.x > 0;
        } else {
          ballWidthCheck = ballPosition.x < 0 && ballPosition.x > -COURT_WIDTH/2;
        }
        
      } else {
        if (serveSide === "ad") {
          ballWidthCheck = ballPosition.x < 0 && ballPosition.x > -COURT_WIDTH/2;
        } else {
          ballWidthCheck = ballPosition.x < COURT_WIDTH/2 && ballPosition.x > 0;
        }
      }

      const ballLengthCheck = ballPosition.y < SERVE_BOX_LENGTH && ballPosition.y > -SERVE_BOX_LENGTH;
      return ballWidthCheck && ballLengthCheck;      
    }

    export function calculateShot({player, playerLocation, ballHeight, shot, oppImpact}: {
        player: {consistency: number, accuracy: number, speed: number},
        playerLocation: Position,
        ballHeight: number,
        shot: {shotAngle: number, power: number, spin: number, launchAngle: number},
        oppImpact: number
    }) : ShotResult {

    // check shot error first, accuracy modifier
    const {shotAngle, error} = checkShotError({
        impact: oppImpact,
        player: player,
        power: shot.power,
        shotAngle: shot.shotAngle,
    });

    if (error) {
        return {
            bouncePoint: {x: 0, y: 0, z: 0, t: 0},
            strikePoint: {x: 0, y: 0, z: 0, t: 0},
            error: true,
            miss: false,
            trajectory2D: [],
            trajectory3D: [],
        }
    }

    // simulate shot
    const angleRad = (shot.launchAngle * Math.PI) / 180;
    const vd = shot.power * MPH_TO_MPS * Math.cos(angleRad); 
    const vz = shot.power * MPH_TO_MPS * Math.sin(angleRad);

    const simShot = simulateTennisShotWithBounce({
      initialVd: vd,
      initialVz: vz,
      spin: shot.spin * (2 * Math.PI / 60), // Convert to rad/s
      initialHeight: ballHeight,
      netD: getNetDistanceAlongShotPath(playerLocation, shot.shotAngle),
    });

    //transform trajectory to 3D
    const trajectory3D = transformTrajectoryTo3D(playerLocation, simShot.trajectory, shot.shotAngle);

    const bouncePoint = transformTrajectoryTo3D(playerLocation, [simShot.bouncePoint], shotAngle)[0];
    const strikePoint = transformTrajectoryTo3D(playerLocation, [simShot.strikePoint], shotAngle)[0];

    // return
    return {
        bouncePoint,
        strikePoint,
        error: false,
        miss: simShot.netError || !isBallInCourt({x: bouncePoint.x, y: bouncePoint.y}),
        trajectory2D: simShot.trajectory,
        trajectory3D: trajectory3D,
    }


    }

    export function checkShotError({impact, player, power, shotAngle} : {
        impact: number,
        player: {consistency: number, accuracy: number},
        power: number,
        shotAngle: number
    }) : {
        shotAngle: number
        errorChance: number,
        error: boolean
    } {
    
        //calculate chance of error
        const strokeErrorChance = 0;//(0.3*(1 - player.consistency) * (power**2)) + (impact ?? 0);    
        const didError = Math.random() < strokeErrorChance;

        //introduce accuracy errors
        const shotAngleWithError = shotAngle;// 5 * ((Math.random() - 0.5) * (((1 - player.accuracy) * (power**2)) + (impact ?? 0)) + shotAngle);

        return {
            shotAngle: shotAngleWithError,
            errorChance: strokeErrorChance,
            error: didError,
        }
    }


    export function getInitialPlayerLocation(serveSide: 'ad' | 'deuce', servePlayer: 'player' | 'opponent') : Position {

        const offset = servePlayer === "player" ? SERVE_POSITION_DIFF : RETURN_POSITION_DIFF
        const initialPlayerLocation = {
            x: serveSide === "ad" ? -offset : offset,
            y: COURT_LENGTH / 2
        };
        return initialPlayerLocation;

    }

    export function getInitialOpponentLocation(serveSide: 'ad' | 'deuce', servePlayer: 'player' | 'opponent') : Position {

        const offset = servePlayer === "player" ? RETURN_POSITION_DIFF : SERVE_POSITION_DIFF
        const initialPlayerLocation = {
            x: serveSide === "ad" ? offset : -offset,
            y: -COURT_LENGTH / 2
        };
        return initialPlayerLocation;

    }

/***THIS SECTION IS FOR OPPONENT HEURISTIC AI PLAY */
    //opponent heuristic play
    export function findTargetBouncePoint(opponentLocation: Position): Position {
        let bestPoint: Position = { x: 0, y: 0 };
        let maxDist = -Infinity;
        let errorMargin = 1;
      
        // Opponent's half: y in [-COURT_LENGTH/2, 0]
        for (let x = (-COURT_WIDTH / 2 + errorMargin); x <= (COURT_WIDTH / 2 - errorMargin); x += 0.5) {
          for (let y = COURT_LENGTH / 3; y <= COURT_LENGTH / 2; y += 0.5) {
            const candidate = { x, y };
            const dist = calculateDistance(opponentLocation, candidate);
            if (dist > maxDist) {
              maxDist = dist;
              bestPoint = candidate;
            }
          }
        }
      
        return bestPoint;
    }

    export function estimateInitialVelocityForBounce({
      playerLocation,
      bouncePoint,
      initialHeight = 1.0,
      power = 50, //in mph
      spin = 1500 * (2 * Math.PI / 60), // Convert to rad/s,
    }: {
      playerLocation: Position;
      bouncePoint: Position;
      initialHeight?: number;
      power?: number;
      spin?: number;
    }) {

      const dt = 0.01;
    
      const dx = bouncePoint.x - playerLocation.x;
      const dy = bouncePoint.y - playerLocation.y;
      const targetDistance = Math.sqrt(dx ** 2 + dy ** 2);
      const direction = { x: dx / targetDistance, y: dy / targetDistance };
    
      const testVd = power * MPH_TO_MPS * 0.7; //approximate vertical D is 60& of power vector
      let bestVz = 0;
      let bestError = Infinity;
      let bestTime = 0;
    
      // Try various vertical velocities
      for (let vzStart = 0; vzStart <= 20; vzStart += 0.2) {
        let vd = testVd;
        let vz = vzStart;
        let d = 0;
        let z = initialHeight;
        let t = 0;
    
        while (z > 0 && t < 5) {
          const speed = Math.sqrt(vd ** 2 + vz ** 2);
          const Fd_d = -k_d * vd * speed ** 2;
          const Fd_z = -k_d * vz * speed ** 2;
          const Fm_d = 0; // No Magnus in flat direction
          const Fm_z = -k_m * spin * vd;
    
          const ax = (Fd_d + Fm_d) / m;
          const az = (Fd_z + Fm_z - m * g) / m;
    
          vd += ax * dt;
          vz += az * dt;
    
          d += vd * dt;
          z += vz * dt;
          t += dt;
        }
    
        const error = Math.abs(d - targetDistance) + Math.abs(z); // should hit z ≈ 0
    
        if (error < bestError) {
          bestError = error;
          bestVz = vzStart;
          bestTime = t;
        }
      }
    
      return {
        initialVd: testVd,
        initialVz: bestVz,
        time: bestTime,
        direction,
      };
    }


      export function generateOptimalShotFromPosition({
        playerStats,
        playerLocation,
        opponentLocation,
        initialHeight = 1.0,
        serve = false,
        serveSide = 'deuce'
      }: {
        playerStats: any,
        playerLocation: Position;
        opponentLocation: Position;
        initialHeight?: number;
        serve?: boolean;
        serveSide?: 'deuce' | 'ad'
      }) {

        let targetBounce: Position = { x: 0, y: 0 };
        if (serve) {
          targetBounce = (serveSide === 'deuce') ? {x: COURT_WIDTH/2 - playerStats.ai.errorMargin, y: SERVE_BOX_LENGTH - playerStats.ai.errorMargin} : {x: -COURT_WIDTH/2 + playerStats.ai.errorMargin, y: SERVE_BOX_LENGTH - playerStats.ai.errorMargin}
        } else {
          targetBounce = findTargetBouncePoint(opponentLocation);
        }

        const defaultSpin = playerStats.ai.defaultSpin;
        
        const { initialVd, initialVz, direction } = estimateInitialVelocityForBounce({
          playerLocation,
          bouncePoint: targetBounce,
          initialHeight,
          power: playerStats.ai.defaultPower,
          spin: defaultSpin * (2 * Math.PI / 60), // Convert to rad/s,
        });

        // Invert physics
        const speed = Math.sqrt(initialVd ** 2 + initialVz ** 2);
        const launchAngle = Math.atan2(initialVz, initialVd) * 180 / Math.PI;
        const power = speed / MPH_TO_MPS;
      
        // Zero-angle direction vector
        const dx0 = 0 - playerLocation.x;
        const dy0 = 0 - playerLocation.y;
        const len0 = Math.sqrt(dx0 ** 2 + dy0 ** 2);
        const ux0 = dx0 / len0;
        const uy0 = dy0 / len0;
      
        const dot = ux0 * direction.x + uy0 * direction.y;
        const det = ux0 * direction.y - uy0 * direction.x;
        const shotAngle = Math.atan2(det, dot) * 180 / Math.PI;

      
        return {
          power,
          shotAngle,
          launchAngle,
          spin: defaultSpin,
        };
    }
    
  

