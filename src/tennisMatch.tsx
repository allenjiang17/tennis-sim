import { useState } from 'react';
import TennisPoint from './tennisGame'; // Assuming your component is in the same directory

export default function TennisMatch() {
  const [playerPoints, setPlayerPoints] = useState(0);
  const [opponentPoints, setOpponentPoints] = useState(0);
  const [playerGames, setPlayerGames] = useState(0);
  const [opponentGames, setOpponentGames] = useState(0);
  const [playerSets, setPlayerSets] = useState(0);
  const [opponentSets, setOpponentSets] = useState(0);

  const [gameCount, setGameCount] = useState(0);     // used to track serve alternation
  const [pointCount, setPointCount] = useState(0);   // used to alternate deuce/ad side
  

  const pointDisplay = ['0', '15', '30', '40', 'Ad'];

  const servePlayer = gameCount % 2 === 0 ? 'player' : 'opponent';
  const serveSide = pointCount % 2 === 0 ? 'deuce' : 'ad';

  function updateScore(winner: 'player' | 'opponent') {
    const isPlayer = winner === 'player';
    const currentPoints = isPlayer ? playerPoints : opponentPoints;
    const otherPoints = isPlayer ? opponentPoints : playerPoints;

    setPointCount((prev) => prev + 1); // Alternate side after every point

    if (currentPoints === 3 && otherPoints < 3) {
      winGame(winner);
    } else if (currentPoints === 3 && otherPoints === 3) {
      isPlayer ? setPlayerPoints(4) : setOpponentPoints(4); // Advantage
    } else if (currentPoints === 4) {
      winGame(winner);
    } else if (currentPoints === 3 && otherPoints === 4) {
      isPlayer ? setOpponentPoints(3) : setPlayerPoints(3); // Back to deuce
    } else {
      isPlayer ? setPlayerPoints(currentPoints + 1) : setOpponentPoints(currentPoints + 1);
    }
  }

  function winGame(winner: 'player' | 'opponent') {
    setGameCount((prev) => prev + 1); // alternate serve every game
    setPointCount(0); // reset serve side counter

    if (winner === 'player') {
      const newGames = playerGames + 1;
      if (newGames >= 6 && newGames - opponentGames >= 2) {
        setPlayerSets(playerSets + 1);
        setPlayerGames(0);
        setOpponentGames(0);
      } else {
        setPlayerGames(newGames);
      }
    } else {
      const newGames = opponentGames + 1;
      if (newGames >= 6 && newGames - playerGames >= 2) {
        setOpponentSets(opponentSets + 1);
        setOpponentGames(0);
        setPlayerGames(0);
      } else {
        setOpponentGames(newGames);
      }
    }

    setPlayerPoints(0);
    setOpponentPoints(0);
  }

  return (
    <div style={{ width:"100%", margin: "auto", padding: '2rem', backgroundColor: '#83c702' }}>
      <TennisPoint
        key={pointCount}
        onPointWinner={(winner) => updateScore(winner)}
        servePlayer={servePlayer}
        serveSide={serveSide}
      />
      <div style={{ width: "100%", display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '3em' }}>
        <h3 style={{margin: 0}}>tennis sim v1</h3>
        <div style={{ display: 'flex', flexDirection: 'row', gap:'2rem'}}>
          <div>sets: <strong>{playerSets}</strong> / {opponentSets}</div>
          <div>games: <strong>{playerGames}</strong> / {opponentGames}</div>
          <div>points: <strong>{pointDisplay[playerPoints]}</strong> / {pointDisplay[opponentPoints]}</div>
        </div>
      </div>
    </div>
    
  );
}