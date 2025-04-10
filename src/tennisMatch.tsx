import React, { useState } from 'react';
import TennisGame from './tennisGame'; // Assuming your component is in the same directory

export default function TennisMatch() {
  const [playerPoints, setPlayerPoints] = useState(0);
  const [opponentPoints, setOpponentPoints] = useState(0);
  const [playerGames, setPlayerGames] = useState(0);
  const [opponentGames, setOpponentGames] = useState(0);
  const [playerSets, setPlayerSets] = useState(0);
  const [opponentSets, setOpponentSets] = useState(0);
  const [lastWinner, setLastWinner] = useState(null);

  const pointDisplay = ['0', '15', '30', '40', 'Ad'];

  function updateScore(winner) {
    setLastWinner(winner);

    const isPlayer = winner === 'player';
    const currentPoints = isPlayer ? playerPoints : opponentPoints;
    const otherPoints = isPlayer ? opponentPoints : playerPoints;

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

  function winGame(winner) {
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
    <div style={{ padding: '2rem' }}>
      <h1>Tennis Simulator 🎾</h1>
      <div style={{ marginBottom: '1rem' }}>
        <strong>Score:</strong><br />
        Sets: Player {playerSets} - Opponent {opponentSets}<br />
        Games: Player {playerGames} - Opponent {opponentGames}<br />
        Points: Player {pointDisplay[playerPoints]} - Opponent {pointDisplay[opponentPoints]}
      </div>

      <TennisGame
        onPointWinner={(winner) => updateScore(winner)}
      />
    </div>
  );
}