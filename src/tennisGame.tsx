// Basic 1-player tennis simulation game in React
import { useState, useRef, useEffect, use } from 'react';
import TennisBallAnimation from './tennisSideView';
import TennisCourt from './tennisCourt';
import { calculateRun, calculateShot, calculateImpact, TrajectoryPoint2D, ShotResult, Position, getNetDistanceAlongShotPath, TrajectoryPoint3D, getInitialPlayerLocation, getInitialOpponentLocation, generateOptimalShotFromPosition, isBallInServeBox } from './utils/helper';
import { ANIMATION_FRAME_LENGTH, SERVE_HEIGHT } from './utils/constants';

const impact = [
    {
        name: "Low",
        description: "You get to the ball with plenty of time to spare, setting yourself up for a perfect shot.",
    },
    {
        name: "Medium",
        description: "You get to the ball with just enough time to set up for a good shot.",
    },
    {
        name: "High",
        description: "You barely get to the ball in time, forcing you to make a difficult shot",
    }
]

const playerStats = {
    name: "Player",
    fitness: 0.8,
    consistency: 0.9,
    accuracy: 0.8,
    speed: 10,
    ai: {
        errorMargin: 1.5, //how close to the line the player is willing to hit
        defaultSpin: 2000, //how much spin the player uses
        defaultPower: 70, //how much power the player uses
    }
}

const opponentStats = {
    name: "Opponent",
    fitness: 0.8,
    consistency: 0.9,
    accuracy: 0.8,
    speed: 10,
    ai: {
        errorMargin: 1, //how close to the line the opponent is willing to hit
        defaultSpin: 2000, //how much spin the opponent uses
        defaultPower: 70, //how much power the opponent uses
    }
}

const opponentDelay = 3000;

export default function TennisPoint(
    { onPointWinner, serveSide, servePlayer }: 
    { onPointWinner: (winner: 'player' | 'opponent') => void, serveSide: 'ad' | 'deuce', servePlayer: 'player' | 'opponent' }
) {  

    //shot parameters
    const [shotAngle, setAngle] = useState(0); // range -60 to 60
    const [shotTrajectory, setShotTrajectory] = useState<TrajectoryPoint2D[]>([]);

    const gameState = useRef<'ready' | 'play' | 'end'>('ready');
    const gameWinner = useRef<'player' | 'opponent' | null>(null);
    const gameTurn = useRef<'player' | 'opponent'>(servePlayer);

    const [playerResult, setPlayerResult] = useState<string | null>(null);
    const [oppResult, setOppResult] = useState<string | null>(null);

    const initPlayerLocation = getInitialPlayerLocation(serveSide, servePlayer);
    const initOpponentLocation = getInitialOpponentLocation(serveSide, servePlayer);

    const [playerTrajectory, setPlayerTrajectory] = useState<TrajectoryPoint3D[]>([{...initPlayerLocation, z: 0 , t: 0}]); 
    const [opponentTrajectory, setOpponentTrajectory] = useState<TrajectoryPoint3D[]>([{...initOpponentLocation, z: 0, t: 0}]);

    const playerPosition = useRef<Position>(initPlayerLocation);
    const opponentPosition = useRef<Position>(initOpponentLocation);
    const ballPosition = useRef<TrajectoryPoint3D>({...initPlayerLocation, z: SERVE_HEIGHT , t: 0});

    const playerShotImpact = useRef<number>(0);
    const opponentShotImpact = useRef<number>(0);

    const rallyCount = useRef(0);
    const componentMounted = useRef(false);

    //ball mechanics
    const [ballTrajectory, setBallTrajectory] = useState<TrajectoryPoint3D[]>([{...initPlayerLocation, z: SERVE_HEIGHT , t: 0}]);

    console.log({ballTrajectory});

    useEffect(() => {
        opponentPosition.current = getCurrentOpponentPosition();
      }, [opponentTrajectory]);

      useEffect(() => {
        playerPosition.current = getCurrentPlayerPosition();
      }, [playerTrajectory]);

    useEffect(() => {
        ballPosition.current = getCurrentBallPosition();
    }, [ballTrajectory]);

    useEffect(() => {
        if (componentMounted.current) {
            autoPlay();
        } else {
            componentMounted.current = true;
        }
    }, []);


    async function autoPlay() {
      
        while (gameState.current !== 'end') {

          let result;

          if (gameTurn.current === 'player') {
            result = handleTurn('player');
            setOppResult(null);

          } else {
            result = handleTurn('opponent');
            setPlayerResult(null);
          }

          console.log(result.trajectoryLength, "trajectory length");
      
          await new Promise(res => setTimeout(res, (result.trajectoryLength * ANIMATION_FRAME_LENGTH))); // wait for the trajectory to finish
        }

    }

    function getCurrentPlayerPosition() {
        return {x: playerTrajectory[playerTrajectory.length - 1].x, y: playerTrajectory[playerTrajectory.length - 1].y};
    }

    function getCurrentOpponentPosition() {
        return {x: opponentTrajectory[opponentTrajectory.length - 1].x, y: opponentTrajectory[opponentTrajectory.length - 1].y};
    }

    function getCurrentBallPosition() {
        return ballTrajectory[ballTrajectory.length - 1];
    }

    function handleTurn(player: 'player' | 'opponent') : {
        gameState: {
            gameOver: boolean,
            winner: 'player' | 'opponent' | 'none',
        },
        shotSummary: string,
        shotImpact: number | null,
        shotResult: ShotResult
        opponentReached: boolean,
        trajectoryLength: number,
    } {

        gameState.current = 'play';

        //set self trajectory to return back to center
        if (player === 'player') {
            setPlayerTrajectory([{x: playerPosition.current.x, y: playerPosition.current.y, z: 0, t: 0}]);
        } else {
            setOpponentTrajectory([{x: opponentPosition.current.x, y: opponentPosition.current.y, z: 0, t: 0}]);
        }

        let playerShotPower;
        let playerShotAngle;
        let playerShotSpin;
        let playerShotLaunchAngle;

        //get stroke data
        const shotParams = generateOptimalShotFromPosition({
            player: player,
            playerStats: player === 'player' ? playerStats : opponentStats,
            playerLocation: player === 'player' ? playerPosition.current : opponentPosition.current,
            opponentLocation: player === 'player' ? opponentPosition.current : playerPosition.current,
            initialHeight: ballPosition.current.z,
            serve: rallyCount.current === 0,
            serveSide: serveSide
        })

                //randomly generate opponent's stroke
        playerShotPower = shotParams.power
        playerShotAngle = shotParams.shotAngle;
        playerShotSpin = shotParams.spin;
        playerShotLaunchAngle = shotParams.launchAngle;

        const shotResult = calculateShot({
            player: player === 'player' ? playerStats : opponentStats,
            playerLocation: player === 'player' ? playerPosition.current : opponentPosition.current,
            ballHeight: ballPosition.current.z,
            shot: { shotAngle: playerShotAngle, power: playerShotPower, spin: playerShotSpin, launchAngle: playerShotLaunchAngle },
            oppImpact: player === 'player' ? opponentShotImpact.current : playerShotImpact.current
        });

        const strokeSummary = `The ball landed at X-${shotResult.bouncePoint.x.toFixed(2)}m, Y-${shotResult.bouncePoint.y.toFixed(2)}m.`;

        if (shotResult.error) {

            gameWinner.current = (player === 'player') ? 'opponent' : 'player'
            gameState.current = 'end';
            if (player === 'player') {
                setPlayerResult("You shanked the ball!");
            } else {
                setOppResult("The opponent shanked the ball!");
            }

            return {
                gameState: {
                    gameOver: true,
                    winner: player === 'player' ? 'opponent' : 'player',
                },
                shotSummary: `You shanked the ball! ${strokeSummary}`,
                shotImpact: 0 ,
                shotResult,
                opponentReached: true,
                trajectoryLength: shotResult.trajectory3D.length,
            };
        }

        //set ball trajectories
        setBallTrajectory(shotResult.trajectory3D);
        setShotTrajectory(shotResult.trajectory2D);


        //calculate misses
        if (rallyCount.current === 0) {

            const serveIn = isBallInServeBox(shotResult.bouncePoint, serveSide, servePlayer);

            if (!serveIn) {

                gameWinner.current = (player === 'player') ? 'opponent' : 'player'
                gameState.current = 'end';
                if (player === 'player') {
                    setPlayerResult("You missed your serve!");
                } else {
                    setOppResult("The opponent missed their!");
                }

                return {
                    gameState: {
                        gameOver: true,
                        winner: player === 'player' ? 'opponent' : 'player',
                    },
                    shotSummary: `${player === 'player' ? "You" : "The opponent"} missed the serve!`,
                    shotImpact: 0,
                    shotResult,
                    opponentReached: false,
                    trajectoryLength: shotResult.trajectory3D.length,
                };
            }

        }

        if (shotResult.miss) {

            gameWinner.current = (player === 'player') ? 'opponent' : 'player'
            gameState.current = 'end';
            if (player === 'player') {
                setPlayerResult("You hit the ball out of bounds!");
            } else {
                setOppResult("The opponent hit the ball out of bounds!");
            }
            
            return {
                gameState: {
                    gameOver: true,
                    winner: player === 'player' ? 'opponent' : 'player',
                },
                shotSummary: `${player === 'player' ? "You" : "The opponent"} missed the shot! ${strokeSummary}`,
                shotImpact: 0 ,
                shotResult,
                opponentReached: true,
                trajectoryLength: shotResult.trajectory3D.length,
            };
        }

        //see if opponent makes it in time
        const oppRunResult = calculateRun(player === 'player' ? opponentPosition.current : playerPosition.current, shotResult.strikePoint, player === 'player' ? opponentStats.speed : playerStats.speed);
        if (player === 'player') {
            setOpponentTrajectory(oppRunResult.trajectory);
        } else {
            setPlayerTrajectory(oppRunResult.trajectory);
        }

        //calculate shot impact
        const shotImpact = calculateImpact(oppRunResult.timeToBall - oppRunResult.timeNeeded, playerShotSpin);

        if (player === 'player') {
            playerShotImpact.current = shotImpact;
        } else {
            opponentShotImpact.current = shotImpact;
        }

        if (!oppRunResult.reached) {

            gameWinner.current = (player === 'player')? 'player' : 'opponent'
            gameState.current = 'end';
            if (player === 'player') {
                setPlayerResult("You hit a clear winner! The opponent did not reach the ball in time.");
            } else {
                setOppResult("The opponent hit a clear winner! You did not reach the ball in time.");
            }
            
            return {
                gameState: {
                    gameOver: true,
                    winner: player === 'player' ? 'player' : 'opponent',
                },
                shotSummary: `You hit a clear winner! The opponent did not reach the ball in time. ${strokeSummary}`,
                shotImpact,
                shotResult,
                opponentReached: false,
                trajectoryLength: shotResult.trajectory3D.length,
            }
        }

        //set result summary
        if (player === 'player') {
            setPlayerResult(`You hit the ball.${strokeSummary} Impact: ${shotImpact.toFixed(2)}`);
        } else {
            setOppResult(`The opponent hit the ball.${strokeSummary} Impact: ${shotImpact.toFixed(2)}`);
        }

        rallyCount.current = rallyCount.current + 1;

        if (player === 'player') {
            gameTurn.current = 'opponent';
        } else {
            gameTurn.current = 'player';
        }

        setBallTrajectory(shotResult.trajectory3D.slice(0, (shotResult.strikePoint.t*100)));
        setShotTrajectory(shotResult.trajectory2D.slice(0, (shotResult.strikePoint.t*100)));

        return {
            gameState: {
                gameOver: false,
                winner: 'none',
            },
            shotSummary: `${player === 'player' ? "You" : "The opponent"} hit the ball. ${strokeSummary} Impact: ${shotImpact.toFixed(2)}`,
            shotImpact,
            shotResult,
            opponentReached: true,
            trajectoryLength: shotResult.trajectory3D.slice(0, (shotResult.strikePoint.t*100)).length,
        };
    }  

    return (
        <div style={{width: "100%", display: "flex", flexDirection: "row", gap: "5rem"}}>
            <TennisCourt 
                playerTrajectory={playerTrajectory}
                opponentTrajectory={opponentTrajectory}
                ballTrajectory={ballTrajectory}
                shotAngle={shotAngle}
            />
            <div style={{ maxWidth: "30rem"}}>
                <TennisBallAnimation 
                    trajectory={shotTrajectory}
                    netX={getNetDistanceAlongShotPath(playerPosition.current, shotAngle)}
                />    
                <div style={{ display: 'none', marginTop: '1rem' }}>
                    <strong>Rally Count:</strong> {rallyCount.current}
                </div>
                {rallyCount.current === 0 && <p>{servePlayer === "player" ? "You bounce the ball and prepare to serve. What kind of serve should you hit?" : "You get ready to return your opponent's serve"}</p>}
                {(playerResult || oppResult) && (
                    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {playerResult && <div><strong>Your hit result:</strong> {playerResult}</div>}
                        {oppResult && <div><strong>The opponent:</strong> {oppResult}</div>}
                    </div>
                )}
                {gameState.current === "end" && gameWinner.current !== null && <button onClick={()=>{onPointWinner(gameWinner.current!)}} style={{ marginTop: '1rem' }}>Next Point</button>}
                {servePlayer === 'opponent' && gameTurn.current === 'opponent' && gameState.current === 'ready' && <button onClick={()=>{handleTurn("opponent")}} style={{ marginTop: '1rem' }}>Ready to return</button>}
                </div>
        </div>
    );
}


