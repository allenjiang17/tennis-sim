// Basic 1-player tennis simulation game in React
import { useState, useRef, useEffect } from 'react';
import TennisBallAnimation from './tennisSideView';
import TennisCourt from './tennisCourt';
import { calculateRun, calculateShot, calculateImpact, checkShotError, TrajectoryPoint2D, ShotResult, Position, getNetDistanceAlongShotPath, TrajectoryPoint3D, getInitialPlayerLocation, getInitialOpponentLocation, generateOptimalShotFromPosition, isBallInServeBox } from './utils/helper';
import { COURT_LENGTH, SERVE_HEIGHT } from './utils/constants';
import { generateLinearEasing } from 'framer-motion';

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
    speed: 5,
}

const opponentStats = {
    name: "Opponent",
    fitness: 0.8,
    consistency: 0.9,
    accuracy: 0.8,
    speed: 5,
    ai: {
        errorMargin: 1, //how close to the line the opponent is willing to hit
        defaultSpin: 1500, //how much spin the opponent uses
        defaultPower: 50, //how much power the opponent uses
    }
}

const opponentDelay = 3000;

export default function TennisPoint(
    { onPointWinner, serveSide, servePlayer }: 
    { onPointWinner: (winner: 'player' | 'opponent') => void, serveSide: 'ad' | 'deuce', servePlayer: 'player' | 'opponent' }
) {  

    console.log({serveSide, servePlayer});

    //shot parameters
    const [power, setPower] = useState(85); // range 0mph to 150 mph
    const [shotAngle, setAngle] = useState(0); // range -60 to 60
    const [launchAngle, setLaunchAngle] = useState(-3); // range -10 to 60
    const [spin, setSpin] = useState(0); // range 0 to 5000 rpm

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

    //ball mechanics
    const [ballTrajectory, setBallTrajectory] = useState<TrajectoryPoint3D[]>([{...initPlayerLocation, z: SERVE_HEIGHT , t: 0}]);


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
        const handleKeyDown = (event: KeyboardEvent) => {
           event.preventDefault();

          if (event.key === "ArrowRight") {
            setAngle(prev => prev + 1);
          } else if (event.key === "ArrowLeft") {
            setAngle(prev => prev - 1);
          }
        };
    
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
      }, []);
    

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
    } {

        gameState.current = 'play';

        //set self trajectory to nothing
        if (player === 'player') {
            setPlayerTrajectory([{x: playerPosition.current.x, y: playerPosition.current.y, z: 0, t: 0}]);
        } else {
            setOpponentTrajectory([{x: opponentPosition.current.x, y: opponentPosition.current.y, z: 0, t: 0}]);
        }

        if (player === 'player') {
            //defaults
            setPower(45);
            setLaunchAngle(15);
            setSpin(500);
        }

        let playerShotPower;
        let playerShotAngle;
        let playerShotSpin;
        let playerShotLaunchAngle;

        //get stroke data
        if (player === 'player') {
            playerShotPower = power;
            playerShotAngle = shotAngle;
            playerShotSpin = spin;
            playerShotLaunchAngle = launchAngle;

        } else {

            const opponentShotParams = generateOptimalShotFromPosition({
                playerStats: opponentStats,
                playerLocation: opponentPosition.current,
                opponentLocation: playerPosition.current,
                initialHeight: ballPosition.current.z,
                serve: rallyCount.current === 0 && servePlayer === 'opponent',
                serveSide: serveSide
            })
                    //randomly generate opponent's stroke
            playerShotPower = opponentShotParams.power
            playerShotAngle = opponentShotParams.shotAngle;
            playerShotSpin = opponentShotParams.spin;
            playerShotLaunchAngle = opponentShotParams.launchAngle;
        }

        const shotResult = calculateShot({
            player: player === 'player' ? playerStats : opponentStats,
            playerLocation: player === 'player' ? playerPosition.current : opponentPosition.current,
            ballHeight: ballPosition.current.z,
            shot: { shotAngle: playerShotAngle, power: playerShotPower, spin: playerShotSpin, launchAngle: playerShotLaunchAngle },
            oppImpact: player === 'player' ? opponentShotImpact.current : playerShotImpact.current
        });

        const strokeSummary = `${player === 'player' ? "You" : "The opponent"} hit had ${playerShotPower.toFixed(2)} adjusted power and landed at X-${shotResult.bouncePoint.x.toFixed(2)}, Y-${shotResult.bouncePoint.y.toFixed(2)}.`;

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
            };
        }

        //calculate shot impact
        const shotImpact = calculateImpact(player === 'player' ? opponentPosition.current : playerPosition.current, shotResult.strikePoint, playerShotPower);
        
        if (player === 'player') {
            playerShotImpact.current = shotImpact;
        } else {
            opponentShotImpact.current = shotImpact;
        }

        //see if opponent makes it in time
        const oppRunResult = calculateRun(player === 'player' ? opponentPosition.current : playerPosition.current, shotResult.strikePoint, player === 'player' ? opponentStats.speed : playerStats.speed);
        if (player === 'player') {
            setOpponentTrajectory(oppRunResult.trajectory);
        } else {
            setPlayerTrajectory(oppRunResult.trajectory);
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
        };
    }  
    
    function handlePlayerTurn() {

        setPlayerResult(null);
        setOppResult(null);
        
        handleTurn("player"); 
        if (gameState.current !== 'end'){
            setTimeout(()=>{handleTurn("opponent")}, opponentDelay)
        };
        
    }

    return (
        <div style={{width: "100%", display: "flex", flexDirection: "row", gap: "50px"}}>
            <TennisCourt 
                playerTrajectory={playerTrajectory}
                opponentTrajectory={opponentTrajectory}
                ballTrajectory={ballTrajectory}
                shotAngle={shotAngle}
            />
            <div style={{marginTop: "4.5rem", maxWidth: "30rem"}}>
                <TennisBallAnimation 
                    trajectory={shotTrajectory}
                    netX={getNetDistanceAlongShotPath(playerPosition.current, shotAngle)}
                />    
                <div style={{ display: 'none', marginTop: '1rem' }}>
                    <strong>Rally Count:</strong> {rallyCount.current}
                </div>
                {rallyCount.current === 0 && <p>{servePlayer === "player" ? "You bounce the ball and prepare to serve. What kind of serve should you hit?" : "You get ready to return your opponent's serve"}</p>}
                {(playerResult || oppResult) && (
                    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                        {playerResult && <p><strong>Your hit result:</strong> {playerResult}</p>}
                        {oppResult && <p><strong>The opponent does:</strong> {oppResult}</p>}
                    </div>
                )}
                {gameState.current === "end" && gameWinner.current !== null && <button onClick={()=>{onPointWinner(gameWinner.current)}} style={{ marginTop: '1rem' }}>Next Point</button>}
                {gameTurn.current === 'player' && gameState.current !== 'end' &&
                    <StrokeControl
                        power={power}
                        setPower={setPower}
                        spin={spin}
                        setSpin={setSpin}
                        launchAngle={launchAngle}
                        setLaunchAngle={setLaunchAngle}
                        shotAngle={shotAngle}
                        setAngle={setAngle}
                        opponentShotImpact={opponentShotImpact.current}
                        handlePlay={handlePlayerTurn}
                    />
                }
                {servePlayer === 'opponent' && gameTurn.current === 'opponent' && gameState.current === 'ready' && <button onClick={()=>{handleTurn("opponent")}} style={{ marginTop: '1rem' }}>Ready to return</button>}
                </div>
        </div>
    );
}


function StrokeControl({
    power,
    setPower,
    spin,
    setSpin,
    launchAngle,
    setLaunchAngle,
    shotAngle,
    setAngle,
    opponentShotImpact,
    handlePlay,
}: {
    power: number;
    setPower: (value: number) => void;
    spin: number;
    setSpin: (value: number) => void;
    launchAngle: number;
    setLaunchAngle: (value: number) => void;
    shotAngle: number;
    setAngle: (value: number) => void;
    opponentShotImpact: number;
    handlePlay: () => void;
}) {               

    return (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '2px solid #ccc', borderRadius: '8px' }}>
                {opponentShotImpact <= 0.1 && opponentShotImpact > 0 && <p>{impact[0].description} (Impact: {opponentShotImpact.toFixed(2)})</p>}
                {opponentShotImpact <= 0.3 && opponentShotImpact > 0.1 && <p>{impact[1].description} (Impact: {opponentShotImpact.toFixed(2)})</p>}
                {opponentShotImpact > 0.3 && <p>{impact[2].description} (Impact: {opponentShotImpact.toFixed(2)})</p>}
            <div>
                <label>Power (mph): {power.toFixed(2)}</label>
                <input type="range" min={0} max={120} step={5} value={power} onChange={(e) => setPower(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
                <label>Launch angle (degrees): {launchAngle.toFixed(2)}</label>
                <input type="range" min={-10} max={60} step={1} value={launchAngle} onChange={(e) => setLaunchAngle(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
                <label>Spin (rpm) {spin.toFixed(2)}</label>
                <input type="range" min={-2000} max={5000} step={100} value={spin} onChange={(e) => setSpin(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
                <label>Angle (degrees): {shotAngle.toFixed(2)}</label>
                <input type="range" min={-60} max={60} step={1} value={shotAngle} onChange={(e) => setAngle(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <button onClick={handlePlay} style={{ marginTop: '1rem' }}>Hit Shot</button>
        </div>
    )
}
