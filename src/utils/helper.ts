import { COURT_WIDTH, COURT_LENGTH, MPH_TO_MPS, NET_POSITION_ALONG_LENGTH } from "./constants";

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
        duration = 5.0,
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
        const g = 9.81;
        const m = 0.057;
        const k_d = 0.00005; //drag coeff
        const k_m = 0.00005; //magnus drag coeff
        const energyLoss = 0.8;
        const frictionLoss = 0.90;

        const netHeight = 0.91;

        const result = [];

        let d = 0;
        let z = initialHeight;
        let vd = initialVd;
        let vz = initialVz;
        let t = 0;

        let firstBouncePoint: TrajectoryPoint2D | null = null;
        let strikePoint: TrajectoryPoint2D | null = null;
        let durationAfterBounce = 10; //fixed for now, 
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
            vd *= frictionLoss;
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
  

    export function calculateShot({player, playerLocation, shot, oppImpact}: {
        player: {consistency: number, accuracy: number, speed: number},
        playerLocation: Position,
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
      initialHeight: 1.2,
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