// Basic 1-player tennis simulation game in React
import { useState } from 'react';
import tennisCourt from './assets/tennis-court.svg'

const strokes = [{
    name: "Topspin",
    power: 0.8,
    consistency: 0.8,
    accuracy: 0.8
    },
    {
    name: "Flat",
    power: 1.0,
    consistency: 0.7,
    accuracy: 0.95
    },
    {
    name: "Slice",
    power: 0.6,
    consistency: 0.9,
    accuracy: 0.9
    }
];

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
    consistency: 0.8,
    accuracy: 0.8,
    speed: 0.1,
}

const opponent = {
    name: "Opponent",
    fitness: 0.8,
    consistency: 0.8,
    accuracy: 0.8,
    speed: 0.3,
}


function calculateImpact(playerLocation: number, target: number, power: number) {
  const impactCoeff = 0.25; // Coefficient to adjust impact
  const dist = Math.abs(target - playerLocation);
  const impact = (dist + 1)**2 * power * impactCoeff ; // +1 to ensure there's always some impact
  return impact;
}

function calculateRun(playerLocation: number, target: number, power: number, speed: number): {
    reached: boolean,
    timeToBall: number,
    timeNeeded: number,
    finalLocation: number
} {
    const distance = Math.abs(playerLocation - target);
    const timeToBall = 1 / (power + 0.1); // +0.1 to avoid division by 0
    const timeNeeded = distance / speed;

    const reached = timeNeeded <= timeToBall;
    const ratio = Math.min(1, timeToBall / timeNeeded);
    const finalLocation = playerLocation + (target - playerLocation) * ratio;

    return { reached, timeToBall, timeNeeded, finalLocation };
}


function calculateStroke(impact: number | null, stroke: string, target: number, power: number) {

    const strokeObj = strokes.find((s)=>s.name === stroke);

    if (!strokeObj) {
        throw new Error(`Stroke ${stroke} not found`);
    }

    console.log({impact});
    console.log(power**2);

    const strokeErrorChance = ((1 - strokeObj?.consistency) * (power**2)) + (impact ?? 0);
    const calcTarget = ((Math.random() - 0.5) * (((1 - strokeObj.accuracy) * (power**2)) + (impact ?? 0)) + target);
    const strokePower = strokeObj.power * power;

    const didError = Math.random() < strokeErrorChance;

    return {
        target: calcTarget,
        errorChance: strokeErrorChance,
        power: strokePower,
        miss: (calcTarget < 0 || calcTarget > 1),
        error: didError,
    }
}

export default function TennisGame({ onPointWinner }: { onPointWinner: (winner: 'player' | 'opponent') => void }) {  
    const [stroke, setStroke] = useState(strokes[0].name);
    const [targetX, setTargetX] = useState(0.5); // range 0 to 1
    const [power, setPower] = useState(0.5); // range 0 to 1

    const [gameState, setGameState] = useState('ready');

    const [playerResult, setPlayerResult] = useState<string | null>(null);
    const [oppResult, setOppResult] = useState<string | null>(null);

    const [playerLocation, setPlayerLocation] = useState(0.5); // range 0 to 1
    const [opponentLocation, setOpponentLocation] = useState(0.5); // range 0 to 1

    const [oppImpact, setOppImpact] = useState<number | null>(null);

    const [rallyCount, setRallyCount] = useState(0);

    //ball mechanics
    const [ballPosition, setBallPosition] = useState<{ x: number, y: 'player' | 'opponent' }>({ x: 0.5, y: 'player' });

    function handlePlayerTurn() : {
        gameOver: boolean,
        playerImpact: number | null,
        playerStrokeResult: {
            target: number,
            errorChance: number,
            power: number,
            miss: boolean,
            error: boolean,
        }
    } {

        const playerStrokeResult = calculateStroke(oppImpact, stroke, targetX, power);
        const playerImpact = calculateImpact(opponentLocation, targetX, playerStrokeResult.power);

        const playerStrokeSummary = `You hit a ${stroke} hit. The hit had ${playerStrokeResult.power.toFixed(2)} adjusted power and landed at ${playerStrokeResult.target.toFixed(2)}. The error chance was ${playerStrokeResult.errorChance.toFixed(2)}.`;

        if (playerStrokeResult.miss) {
            setPlayerResult(`You missed the shot! ${playerStrokeSummary}`);
            setOppResult(null);
            setOppImpact(null);
            onPointWinner('opponent');
            setGameState('end');
            return {
                gameOver: true,
                playerImpact,
                playerStrokeResult
            };
        }

        if (playerStrokeResult.error) {
            setPlayerResult(`Shank! ${playerStrokeSummary}`);
            setOppResult(null);
            setOppImpact(null);
            onPointWinner('opponent');
            setGameState('end');
            return {
                gameOver: true,
                playerImpact,
                playerStrokeResult
            };
        }

        setPlayerResult(`${playerStrokeSummary}. Impact: ${playerImpact.toFixed(2)}`);
        setOppResult(null)

        //see if opponent makes it in time
        const oppRunResult= calculateRun(opponentLocation, playerStrokeResult.target, playerStrokeResult.power, opponent.speed);
        console.log({oppRunResult});
        setOpponentLocation(oppRunResult.finalLocation);
        if (!oppRunResult.reached) {
            setPlayerResult("You hit a clear winner! The opponent did not reach the ball in time. " + playerStrokeSummary);
            onPointWinner('player');
            setGameState('end');
            setOppImpact(null);
            return {
                gameOver: true,
                playerImpact,
                playerStrokeResult
            }
        }

        setRallyCount(rallyCount + 1);

        return {
            gameOver: false,
            playerImpact,
            playerStrokeResult
        };
    }

    function handleOpponentTurn(playerImpact: number | null) : {
        gameOver: boolean,
        opponentImpact: number | null,
        opponentStrokeResult: {
            target: number,
            errorChance: number,
            power: number,
            miss: boolean,
            error: boolean,
        }
    } {

        let oppImpactTemp = oppImpact;

        //randomly generate opponent's stroke
        const opponentStroke = strokes[Math.floor(Math.random() * strokes.length)];
        const opponentTargetX = Math.random();
        const opponentPower = 0.5;

        //calc opponents stroke
        const opponentStrokeResult = calculateStroke(playerImpact, opponentStroke.name, opponentTargetX, opponentPower);
        oppImpactTemp = calculateImpact(playerLocation, opponentTargetX, opponentStrokeResult.power);
        const opponentStrokeSummary = `Opponent hit a ${opponentStroke.name} hit. The hit had ${opponentStrokeResult.power.toFixed(2)} adjusted power and landed at ${opponentStrokeResult.target.toFixed(2)}. The error chance was ${opponentStrokeResult.errorChance.toFixed(2)}.`;

        if (opponentStrokeResult.miss) {
            setOppResult(`Opponent missed. ${opponentStrokeSummary}`);
            setGameState('end');
            onPointWinner('player');
            setOppImpact(null);
            return {
                gameOver: true,
                opponentImpact: oppImpactTemp,
                opponentStrokeResult
            }
        }

        if (opponentStrokeResult.error) {
            setOppResult(`Opponent shanked the ball. ${opponentStrokeSummary}`);
            setGameState('end');
            onPointWinner('player');
            setOppImpact(null);
            return { 
                gameOver: true,
                opponentImpact: oppImpactTemp,
                opponentStrokeResult
            }
        }

        setOppResult(`${opponentStrokeSummary} Impact: ${oppImpactTemp.toFixed(2)}`);
        setOppImpact(oppImpactTemp);

        //see if player makes it in time
        const playerRunResult = calculateRun(playerLocation, opponentStrokeResult.target, opponentStrokeResult.power, player.speed);
        console.log({playerRunResult});
        setPlayerLocation(playerRunResult.finalLocation);
        if (!playerRunResult.reached) {
            setOppResult(`Opponent hit a clear winner! You did not reach the ball in time. ${opponentStrokeSummary}`);          
            onPointWinner('opponent');
            setGameState('end');
            return {
                gameOver: true,
                opponentImpact: oppImpactTemp,
                opponentStrokeResult
            }
        }

        setRallyCount(rallyCount + 1);
        return {
            gameOver: false,
            opponentImpact: oppImpactTemp,
            opponentStrokeResult
        };

    }

    function handlePlay() {
        const playerTurnResults = handlePlayerTurn();

        if (playerTurnResults.playerStrokeResult) {
            if (playerTurnResults.playerStrokeResult?.error) {
                return;
            }
            setBallPosition({ x: playerTurnResults.playerStrokeResult?.target, y: 'opponent' });
        }

        //do not play opponent turn if player mistake
        if (playerTurnResults.gameOver) {
            return;
        }

        setTimeout(() => {
            const oppTurnResults = handleOpponentTurn(playerTurnResults.playerImpact!);

            if (oppTurnResults.opponentStrokeResult) {
                if (oppTurnResults.opponentStrokeResult.error) {
                    return;
                }
                setBallPosition({ x: oppTurnResults.opponentStrokeResult.target, y: 'player' });
            }

        }, 1000);
    }

    function resetGame() {
        setGameState('ready');
        setPlayerResult(null);
        setOppResult(null);
        setStroke(strokes[0].name);
        setTargetX(0.5);
        setPower(0.5);
        setRallyCount(0);
        setOppImpact(null);
        setPlayerLocation(0.5);
        setOpponentLocation(0.5);
        setBallPosition({ x: 0.5, y: 'player' });
    }

    return (
        <div style={{display: "flex", flexDirection: "row", maxWidth: "1000px"}}>
            <TennisCourt
                playerLocation={playerLocation}
                opponentLocation={opponentLocation}
                ballPosition={ballPosition}
            />            
            <div style={{width: "60%"}}>
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
                        stroke={stroke}
                        setStroke={setStroke}
                        targetX={targetX}
                        setTargetX={setTargetX}
                        power={power}
                        setPower={setPower}
                        handlePlay={handlePlay}
                    />
                )}
                </div>
        </div>
    );
}


function StrokeControl({stroke, setStroke, targetX, setTargetX, power, setPower, handlePlay} : {
    stroke: string;
    setStroke: (stroke: string) => void;
    targetX: number;
    setTargetX: (targetX: number) => void;
    power: number;
    setPower: (power: number) => void;
    handlePlay: () => void;
}) {

    return (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '2px solid #ccc', borderRadius: '8px' }}>
            <div>
                <label>Stroke: </label>
                <select value={stroke} onChange={(e) => setStroke(e.target.value)}>
                    {strokes.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
            </div>

            <div>
                <label>Target (0 = far left, 1 = far right): {targetX.toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.01} value={targetX} onChange={(e) => setTargetX(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>

            <div>
                <label>Power (0 = soft, 1 = max): {power.toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.01} value={power} onChange={(e) => setPower(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <button onClick={handlePlay} style={{ marginTop: '1rem' }}>Hit Shot</button>
        </div>
    )
}

function TennisCourt({ playerLocation = 0.5, opponentLocation = 0.5, ballPosition }: {
    playerLocation: number;
    opponentLocation: number;
    ballPosition: { x: number, y: 'player' | 'opponent' };
}) {
    const getLeftPosition = (location: number) => `${(location * 46) + 27}%`;

    const sharedStyle = {
        position: 'absolute' as const,
        fontSize: '2rem',
        transition: 'left 0.5s ease-in-out, top 0.5s ease-in-out',
    };

    const getTopPosition = (side: 'player' | 'opponent') => side === 'player' ? '95%' : '5%';

    return (
        <div style={{ position: 'relative', maxWidth: "30rem", margin: '2rem auto' }}>
            {/* Opponent Icon */}
            <div
                style={{
                    ...sharedStyle,
                    top: 0,
                    left: getLeftPosition(opponentLocation),
                    transform: 'translate(-50%, -150%)',
                }}
            >
                🤖
            </div>

            {/* Tennis Court Image */}
            <img
                src={tennisCourt}
                alt="Tennis Court"
                style={{
                    width: '100%',
                    height: 'auto',
                    transform: 'rotate(90deg)',
                    filter: 'invert(1)',
                }}
            />

            {/* Player Icon */}
            <div
                style={{
                    ...sharedStyle,
                    bottom: 0,
                    left: getLeftPosition(playerLocation),
                    transform: 'translate(-50%, 150%)',
                }}
            >
                🧍
            </div>

            {/* Ball Icon */}
                <div
                    style={{
                        ...sharedStyle,
                        top: getTopPosition(ballPosition.y),
                        left: getLeftPosition(ballPosition.x),
                        transform: 'translate(-50%, -50%)',
                        transition: 'left 0.5s ease-in-out, top 0.5s ease-in-out',
                    }}
                >
                    🎾
                </div>
        </div>
    );
}