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

function calculateImpact(playerLocation: number, target: number, power: number) {
  const impactCoeff = 0.25; // Coefficient to adjust impact
  const dist = Math.abs(target - playerLocation);
  const impact = (dist + 1)**2 * power * impactCoeff ; // +1 to ensure there's always some impact
  return impact;
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

    return {
        target: calcTarget,
        errorChance: strokeErrorChance,
        power: strokePower,
        miss: (calcTarget < 0 || calcTarget > 1),
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

    function handlePlay() {
        let rallyCountTemp = rallyCount; 
        let oppImpactTemp = oppImpact;

        const playerStrokeResult = calculateStroke(oppImpact, stroke, targetX, power);
        const playerImpact = calculateImpact(opponentLocation, targetX, playerStrokeResult.power);

        const playerStrokeSummary = `You hit a ${stroke} hit. The hit had ${playerStrokeResult.power.toFixed(2)} adjusted power and landed at ${playerStrokeResult.target.toFixed(2)}. The error chance was ${playerStrokeResult.errorChance.toFixed(2)}.`;

        if (playerStrokeResult.miss) {
            setPlayerResult(`You missed the shot! ${playerStrokeSummary}`);
            setOppResult(null);
            setOppImpact(null);
            onPointWinner('opponent');
            setGameState('end');
            return;
        }

        const didError = Math.random() < playerStrokeResult.errorChance;
        if (didError) {
            setPlayerResult(`Shank! ${playerStrokeSummary}`);
            setOppResult(null);
            setOppImpact(null);
            onPointWinner('opponent');
            setGameState('end');
            return;
        }

        rallyCountTemp++;
        setPlayerResult(`${playerStrokeSummary}. Impact: ${playerImpact.toFixed(2)}`);

        setOpponentLocation(playerStrokeResult.target);

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
            return;
        }

        const oppError = Math.random() < opponentStrokeResult.errorChance;
        if (oppError) {
            setOppResult(`Opponent shanked teh ball. ${opponentStrokeSummary}`);
            setGameState('end');
            onPointWinner('player');
            setOppImpact(null);
            return;
        }

        setOppResult(`${opponentStrokeSummary} Impact: ${oppImpactTemp.toFixed(2)}`);
        setOppImpact(oppImpactTemp);
        setPlayerLocation(opponentStrokeResult.target);

        rallyCountTemp++;
        setRallyCount(rallyCountTemp);
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
    }

    return (
        <div style={{display: "flex", flexDirection: "row", maxWidth: "1000px"}}>
            <TennisCourt playerLocation={playerLocation} opponentLocation={opponentLocation} />
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

                {oppImpact && oppImpact <= 0.1 && <p>{impact[0].description} (Impact: {oppImpact.toFixed(2)})</p>}
                {oppImpact && oppImpact <= 0.4 && oppImpact > 0.1 && <p>{impact[1].description} (Impact: {oppImpact.toFixed(2)})</p>}
                {oppImpact && oppImpact > 0.4 && <p>{impact[2].description} (Impact: {oppImpact.toFixed(2)})</p>}


                {gameState === "end" ? (
                    <button onClick={resetGame} style={{ marginTop: '1rem' }}>Next Game</button>
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

function TennisCourt({ playerLocation = 0.5, opponentLocation = 0.5 }) {
    // Convert location (0–1) to % positioning
    const getLeftPosition = (location) => `${location * 100}%`;
  
    return (
      <div style={{ position: 'relative', maxWidth: "30rem", margin: '2rem auto' }}>
        {/* Opponent Icon */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: getLeftPosition(opponentLocation),
            transform: 'translate(-50%, -150%)',
            fontSize: '1.5rem',
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
            position: 'absolute',
            bottom: 0,
            left: getLeftPosition(playerLocation),
            transform: 'translate(-50%, 150%)',
            fontSize: '1.5rem',
          }}
        >
          🧍
        </div>
      </div>
    );
  }