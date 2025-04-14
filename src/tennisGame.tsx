// Basic 1-player tennis simulation game in React
import { useState, useRef, useEffect } from 'react';
import TennisBallAnimation from './tennisSideView';
import TennisCourt from './tennisCourt';
import { calculateRun, calculateShot, calculateImpact, checkShotError, TrajectoryPoint2D, ShotResult, Position, getNetDistanceAlongShotPath, TrajectoryPoint3D } from './utils/helper';
import { COURT_LENGTH, INITIAL_OPPONENT_LOCATION, INITIAL_PLAYER_LOCATION } from './utils/constants';

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

const player = {
    name: "Player",
    fitness: 0.8,
    consistency: 0.9,
    accuracy: 0.8,
    speed: 5,
}

const opponent = {
    name: "Opponent",
    fitness: 0.8,
    consistency: 0.9,
    accuracy: 0.8,
    speed: 5,
}

export default function TennisGame({ onPointWinner }: { onPointWinner: (winner: 'player' | 'opponent') => void }) {  

    //shot parameters
    const [power, setPower] = useState(50); // range 0mph to 100 mph
    const [shotAngle, setAngle] = useState(0); // range -60 to 60
    const [launchAngle, setLaunchAngle] = useState(20); // range -10 to 60
    const [spin, setSpin] = useState(0); // range 0 to 5000 rpm

    const [shotTrajectory, setShotTrajectory] = useState<TrajectoryPoint2D[]>([]);

    const [gameState, setGameState] = useState('ready');

    const [playerResult, setPlayerResult] = useState<string | null>(null);
    const [oppResult, setOppResult] = useState<string | null>(null);

    const [playerTrajectory, setPlayerTrajectory] = useState<TrajectoryPoint3D[]>([{...INITIAL_PLAYER_LOCATION, z: 0 , t: 0}]); 
    const [opponentTrajectory, setOpponentTrajectory] = useState<TrajectoryPoint3D[]>([{...INITIAL_OPPONENT_LOCATION, z: 0, t: 0}]);
    const playerPosition = useRef<Position>(INITIAL_PLAYER_LOCATION);
    const opponentPosition = useRef<Position>(INITIAL_OPPONENT_LOCATION);

    const [oppImpact, setOppImpact] = useState<number | null>(null);

    const [rallyCount, setRallyCount] = useState(0);

    //ball mechanics
    const [ballTrajectory, setBallTrajectory] = useState<TrajectoryPoint3D[]>([{...INITIAL_PLAYER_LOCATION, z: 0 , t: 0}]);


    useEffect(() => {
        opponentPosition.current = getCurrentOpponentPosition();
      }, [opponentTrajectory]);

      useEffect(() => {
        playerPosition.current = getCurrentPlayerPosition();
      }, [playerTrajectory]);

    function getCurrentPlayerPosition() {
        return {x: playerTrajectory[playerTrajectory.length - 1].x, y: playerTrajectory[playerTrajectory.length - 1].y};
    }

    function getCurrentOpponentPosition() {
        return {x: opponentTrajectory[opponentTrajectory.length - 1].x, y: opponentTrajectory[opponentTrajectory.length - 1].y};
    }

    function handlePlayerTurn() : {
        gameOver: boolean,
        playerImpact: number | null,
        playerShotResult: ShotResult
    } {

        //set self trajectory to nothing
        setPlayerTrajectory([{x: playerPosition.current.x, y: playerPosition.current.y, z: 0, t: 0}]);

        const playerShotResult = calculateShot({
            player: player,
            playerLocation: playerPosition.current,
            shot: { shotAngle: shotAngle, power: power, spin: spin, launchAngle: launchAngle },
            oppImpact: oppImpact!
        });
        const playerImpact = calculateImpact(opponentPosition.current, playerShotResult.strikePoint, power);

        const playerStrokeSummary = `You hit the ball. The hit had ${power.toFixed(2)} adjusted power and landed at X-${playerShotResult.bouncePoint.x.toFixed(2)}, Y-${playerShotResult.bouncePoint.y.toFixed(2)}.`;

        if (playerShotResult.miss) {
            setPlayerResult(`You missed the shot! ${playerStrokeSummary}`);
            setOppResult(null);
            setOppImpact(null);
            onPointWinner('opponent');
            setGameState('end');
            return {
                gameOver: true,
                playerImpact,
                playerShotResult
            };
        }

        if (playerShotResult.error) {
            setPlayerResult(`Shank! ${playerStrokeSummary}`);
            setOppResult(null);
            setOppImpact(null);
            onPointWinner('opponent');
            setGameState('end');
            return {
                gameOver: true,
                playerImpact,
                playerShotResult
            };
        }

        setPlayerResult(`${playerStrokeSummary}. Impact: ${playerImpact.toFixed(2)}`);
        setOppResult(null)

        //see if opponent makes it in time
        const oppRunResult = calculateRun(opponentPosition.current, playerShotResult.strikePoint, opponent.speed);
        setOpponentTrajectory(oppRunResult.trajectory);

        if (!oppRunResult.reached) {
            setPlayerResult("You hit a clear winner! The opponent did not reach the ball in time. " + playerStrokeSummary);
            onPointWinner('player');
            setGameState('end');
            setOppImpact(null);
            return {
                gameOver: true,
                playerImpact,
                playerShotResult
            }
        }

        setRallyCount(rallyCount + 1);

        return {
            gameOver: false,
            playerImpact,
            playerShotResult
        };
    }

    function handleOpponentTurn(playerImpact: number | null) : {
        gameOver: boolean,
        opponentImpact: number | null,
        opponentShotResult: ShotResult
        }
    {

        let oppImpactTemp = oppImpact;
        //set self trajectory to nothing
        setOpponentTrajectory([{x: opponentPosition.current.x, y: opponentPosition.current.y, z: 0, t: 0}]);

        //randomly generate opponent's stroke
        const opponentPower = 50;
        const opponentShotAngle = 0;
        const opponentSpin = 2000; // 1000 rpm
        const opponentLaunchAngle = 17; // 25 degrees


        console.log({opponentPosition: opponentPosition.current})
        //calc opponents stroke
        const opponentShotResult = calculateShot({
            player: opponent,
            playerLocation: opponentPosition.current,
            shot: { shotAngle: opponentShotAngle, power: opponentPower, spin: opponentSpin, launchAngle: opponentLaunchAngle },
            oppImpact: playerImpact!
        });

        oppImpactTemp = calculateImpact(playerPosition.current, opponentShotResult.strikePoint, opponentPower);

        const opponentStrokeSummary = `Opponent hit the ball. The hit had ${opponentPower.toFixed(2)} power and landed at ${opponentShotResult.bouncePoint.x.toFixed(2)}, ${opponentShotResult.bouncePoint.y.toFixed(2)}.`;

        if (opponentShotResult.miss) {
            setOppResult(`Opponent missed. ${opponentStrokeSummary}`);
            setGameState('end');
            onPointWinner('player');
            setOppImpact(null);
            return {
                gameOver: true,
                opponentImpact: oppImpactTemp,
                opponentShotResult
            }
        }

        if (opponentShotResult.error) {
            setOppResult(`Opponent shanked the ball. ${opponentStrokeSummary}`);
            setGameState('end');
            onPointWinner('player');
            setOppImpact(null);
            return { 
                gameOver: true,
                opponentImpact: oppImpactTemp,
                opponentShotResult
            }
        }

        setOppResult(`${opponentStrokeSummary} Impact: ${oppImpactTemp.toFixed(2)}`);
        setOppImpact(oppImpactTemp);

        //see if player makes it in time
        const playerRunResult = calculateRun(playerPosition.current, opponentShotResult.strikePoint, player.speed);
        setPlayerTrajectory(playerRunResult.trajectory);
        if (!playerRunResult.reached) {
            setOppResult(`Opponent hit a clear winner! You did not reach the ball in time. ${opponentStrokeSummary}`);          
            onPointWinner('opponent');
            setGameState('end');
            return {
                gameOver: true,
                opponentImpact: oppImpactTemp,
                opponentShotResult
            }
        }

        setRallyCount(rallyCount + 1);
        return {
            gameOver: false,
            opponentImpact: oppImpactTemp,
            opponentShotResult
        };

    }

    function handlePlay() {
        const playerTurnResults = handlePlayerTurn();

        if (playerTurnResults.playerShotResult) {
            if (playerTurnResults.playerShotResult?.error) {
                return;
            }
            setBallTrajectory(playerTurnResults.playerShotResult.trajectory3D);
            setShotTrajectory(playerTurnResults.playerShotResult.trajectory2D);
        }

        console.log({opponentTrajectory: opponentTrajectory})
        //do not play opponent turn if player mistake
        if (playerTurnResults.gameOver) {
            return;
        }

        setTimeout(() => {
            const oppTurnResults = handleOpponentTurn(playerTurnResults.playerImpact!);

            if (oppTurnResults.opponentShotResult) {
                if (oppTurnResults.opponentShotResult.error) {
                    return;
                }
                setBallTrajectory(oppTurnResults.opponentShotResult.trajectory3D);
            }

        }, 10000);
    }

    function resetGame() {
        setGameState('ready');
        setPlayerResult(null);
        setOppResult(null);
        setPower(50);

        setShotTrajectory([]);
        setAngle(0);
        setLaunchAngle(15);
        setSpin(0);

        setRallyCount(0);
        setOppImpact(null);

         setPlayerTrajectory([{...INITIAL_PLAYER_LOCATION, z: 0 , t: 0}]); 
         setOpponentTrajectory([{...INITIAL_OPPONENT_LOCATION, z: 0 , t: 0}]); 
         setBallTrajectory([{...INITIAL_PLAYER_LOCATION, z: 0 , t: 0}]);
    }

    return (
        <div style={{display: "flex", flexDirection: "row", gap: "50px"}}>
            <TennisCourt 
                playerTrajectory={playerTrajectory}
                opponentTrajectory={opponentTrajectory}
                ballTrajectory={ballTrajectory}
                shotAngle={shotAngle}
            />
            <div style={{maxWidth: "30rem"}}>
                <TennisBallAnimation 
                    trajectory={shotTrajectory}
                    netX={getNetDistanceAlongShotPath(playerPosition.current, shotAngle)}
                />    
                <div style={{ marginTop: '1rem' }}>
                    <strong>Rally Count:</strong> {rallyCount}
                </div>
                {(playerResult || oppResult || oppImpact !== null) && (
                    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                        {playerResult && <p><strong>Your hit result:</strong> {playerResult}</p>}
                        {oppResult && <p><strong>The opponent does:</strong> {oppResult}</p>}
                    </div>
                )}

                {gameState !== "end" && oppImpact && oppImpact <= 0.1 && <p>{impact[0].description} (Impact: {oppImpact.toFixed(2)})</p>}
                {gameState !== "end" && oppImpact && oppImpact <= 0.3 && oppImpact > 0.1 && <p>{impact[1].description} (Impact: {oppImpact.toFixed(2)})</p>}
                {gameState !== "end" && oppImpact && oppImpact > 0.3 && <p>{impact[2].description} (Impact: {oppImpact.toFixed(2)})</p>}
                {gameState === "end" ? (
                    <button onClick={resetGame} style={{ marginTop: '1rem' }}>Next Point</button>
                ) : (
                    <StrokeControl
                        power={power}
                        setPower={setPower}
                        spin={spin}
                        setSpin={setSpin}
                        launchAngle={launchAngle}
                        setLaunchAngle={setLaunchAngle}
                        shotAngle={shotAngle}
                        setAngle={setAngle}
                        handlePlay={handlePlay}
                    />
                )}
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
    handlePlay: () => void;
}) {               

    return (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '2px solid #ccc', borderRadius: '8px' }}>
            <div>
                <label>Power (mph): {power.toFixed(2)}</label>
                <input type="range" min={0} max={100} step={5} value={power} onChange={(e) => setPower(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
                <label>Launch Angle (degrees): {launchAngle.toFixed(2)}</label>
                <input type="range" min={-10} max={60} step={1} value={launchAngle} onChange={(e) => setLaunchAngle(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
                <label>Spin {spin.toFixed(2)}</label>
                <input type="range" min={-2000} max={5000} step={100} value={spin} onChange={(e) => setSpin(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
                <label>X-Angle (0 = far left, 1 = far right): {shotAngle.toFixed(2)}</label>
                <input type="range" min={-60} max={60} step={1} value={shotAngle} onChange={(e) => setAngle(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <button onClick={handlePlay} style={{ marginTop: '1rem' }}>Hit Shot</button>
        </div>
    )
}
